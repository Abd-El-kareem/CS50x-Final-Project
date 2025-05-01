import json
import uuid
from django.shortcuts import render
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.urls import reverse
from django.core.exceptions import ValidationError
from django.db.models import Prefetch
from .forms import RegisterationForm, LoginForm, QuizForm, QuestionFormSet, AnswerFormSet, QuestionForm
from .models import User,Category, Quiz, Question, Answer, QuizScore
from .util import call_groq, convert_to_HTML, map_question_answer

# Create your views here.

def index(request):
    return render(request, 'quiz/index.html')

def login_view(request):

    if request.method == "POST":
        # Grab and Validate the data
        data = LoginForm(request, data=request.POST)
        if data.is_valid():
            # After validating the data you can log the user securly
            user = data.get_user()
            login(request, user)
            messages.info(request, "Logged in Successfully.")
            return HttpResponseRedirect(reverse("quiz:index"))

        # if the data isn't valid display an error
        messages.error(request, "Invalid Credentials Username/Password")
        return render(request, 'quiz/login.html', {
                    "form": LoginForm(request, data=request.POST)
                })

    else:
        return render(request, 'quiz/login.html', {
            "form": LoginForm()
        })

@login_required
def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("quiz:login"))

def register(request):
    if request.method == "POST":
        # Grab and Validate the data
        data = RegisterationForm(request.POST)
        if data.is_valid():
            username = data.cleaned_data['username']
            password = data.cleaned_data['password']
            pass_conf = data.cleaned_data['password_confirmation']
            # check the password matching
            if password != pass_conf:
                messages.error(request, "Passwords must match.")
                return render(request, 'quiz/register.html', {
                    "form": RegisterationForm(request.POST)
                })

            # After Validating the username and the password Create user securely
            user = User.objects.create_user(username=username, password=password)
            user.save()
            login(request, user)
            return HttpResponseRedirect(reverse("quiz:index"))

        # if the data isn't valid display an error
        messages.error(request, "Username already taken.")
        return render(request, 'quiz/register.html', {
                    "form": RegisterationForm(request.POST)
                })

    # When user visits the route via GET method
    else:
        return render(request, 'quiz/register.html', {
            "form": RegisterationForm()
        })

@login_required
def create_quiz(request):
    if request.method == 'POST':
        quiz_form_data = QuizForm(request.POST)

        # Mark the required fields for every form in the question formset to validate the data correctly.
        question_formset_data = QuestionFormSet(request.POST, prefix='questions')
        for form in question_formset_data:
            form.empty_permitted = False

        # Mark the required fields for every form in the answer formset to validate the data correctly.
        answer_formset_data = AnswerFormSet(request.POST, prefix="answers", request=request)
        for form in answer_formset_data:
            form.empty_permitted = False

        # Validate the submitted data.
        if quiz_form_data.is_valid() and question_formset_data.is_valid() and answer_formset_data.is_valid():
            # Save the quiz object in the database.
            quiz = quiz_form_data.save(commit=False)
            quiz.owner = request.user
            quiz.save()

            # Save the question objects and connect each question with the quiz in the database.
            questions = question_formset_data.save(commit=False)
            for question in questions:
                question.quiz = quiz
            Question.objects.bulk_create(questions)

            # Save the question objects and connect each answer with its question in the database.
            answers = answer_formset_data.save(commit=False)
            for data, answer in zip(answer_formset_data ,answers):
                answer.question = questions[data.cleaned_data['for_question_index']]
            Answer.objects.bulk_create(answers)

            quiz.save()
            messages.success(request, "Quiz Created Successfully.")
            return HttpResponseRedirect(reverse('quiz:index'))
        else:
            # Link Each answer with its question to handle them correctly in the HTML file.
            question_answer_mappings = map_question_answer(answer_formset_data)
            question_answer_pairs = [{question_form:question_answer_mappings[question_form.prefix[-1]]} for question_form in question_formset_data]

            quiz_form = QuizForm(request.POST)
            return render(request, 'quiz/create.html', {
            'question_formset': question_formset_data,
            'answer_formset': answer_formset_data,
            'quiz_form': quiz_form,
            'pairs': question_answer_pairs
        })
    else:
        quiz_form = QuizForm()
        question_formset = QuestionFormSet(prefix='questions')
        answer_formset = AnswerFormSet(prefix='answers')
        # Link the question form with the two answers to handle them in the HTML file correctly.
        question_answer_pairs = [{q_form: [a_form for a_form in answer_formset]} for q_form in question_formset]
    return render(request, 'quiz/create.html', {
        'question_formset': question_formset,
        'answer_formset': answer_formset,
        'quiz_form': quiz_form,
        'pairs': question_answer_pairs
    })

def load_quizzes(request, category_id):
    user = request.user
    try:
        category = Category.objects.get(pk=category_id)
    except Category.DoesNotExist:
        return JsonResponse({"error": "No such Category."}, status=404)
    quizzes = Quiz.objects.select_related('category').prefetch_related("questions").filter(category=category)
    # Filter the quizzes to show just the quizzes that user doesn't submit before.
    if user.is_authenticated:
        for quiz in quizzes:
            try:
                score = QuizScore.objects.get(quiz=quiz, user=user)
                quizzes = quizzes.exclude(pk=quiz.id)
            except QuizScore.DoesNotExist:
                continue
    quizzes_dict = {}
    quizzes_dict['quizzes'] = []
    if quizzes:
        for quiz in quizzes:
            quizzes_dict['quizzes'].append({
                "id": quiz.id,
                "user": user.username,
                "owner": quiz.owner.username,
                "title": quiz.title, 
                "is_public": quiz.is_public,
                "questions_count": quiz.questions.all().count(),
                "total_points": quiz.total_points,
                "timestamp": quiz.timestamp.strftime("%b %d %Y"),
                "category": category.serialize(),
            })
        quizzes_dict["message"] = None
        return JsonResponse(quizzes_dict, status=201)
    else:
        return JsonResponse({"message": "No Quizzes."}, status=201)

def view_categories(request):
    categories = Category.objects.all()
    return render(request, 'quiz/categories.html', {
        "categories": categories
    })

def view_quiz(request, quiz_id):
    # Attempt to get the quiz.
    try:
        quiz = Quiz.objects.get(pk=quiz_id)
    except Quiz.DoesNotExist:
        return JsonResponse({"error": "Quiz not found."}, status=404)

    return render(request, 'quiz/quiz.html', {
        "quiz": quiz
    })

def quiz(request, quiz_id):
    user = request.user

    # Attempt to get the quiz.
    try:
        answers = Prefetch("answers", queryset=Answer.objects.order_by("timestamp"))
        questions_answers = Prefetch("questions", queryset=Question.objects.prefetch_related(answers).order_by("timestamp"))
        if user.is_authenticated:
            user_answers = Prefetch("questions__answers", queryset=Answer.objects.filter(selected_by=user).select_related('question'), to_attr='user_answers')
            quiz = Quiz.objects.select_related("owner", "category").prefetch_related(questions_answers, user_answers).get(pk=quiz_id)
        else:
            quiz = Quiz.objects.select_related("owner", "category").prefetch_related(questions_answers).get(pk=quiz_id)

        prefetched_questions = quiz.questions.all()
        # Serialize the data
        data = quiz.serialize(user, prefetched_questions) if user.is_authenticated else quiz.serialize(None, prefetched_questions)
    except Quiz.DoesNotExist:
        return JsonResponse({"error": "Quiz not found."}, status=404)

    # Check if the user is authenticated.
    if not user.is_authenticated:
        # Add the selected_answers key in the session if it hasn't been added yet.
        selected_answers = request.session.get('selected_answers', {})

        # For each question check if the user hasn't answer the question yet.
        for q in quiz.questions.all():
            selected_answers.setdefault(str(q.id), None)

        # Save the alterations in the session.
        request.session['selected_answers'] = selected_answers

        # Update the data's selected answers.
        data['selected_answers'] = selected_answers

        # Do the same thing with scores.
        scores = request.session.get('scores', {})
        scores.setdefault(str(quiz.id), None)
        request.session['scores'] = scores

        # Update the data's score.
        data['score'] = scores[str(quiz.id)]
    else:
        if data['score']:
            data['score'] = data['score'].serialize(user, quiz)

    # Save the alterations to the session
    request.session.modified = True

    # Return Quiz contents
    if request.method == "GET":
        return JsonResponse(data)

def update_answer(request, answer_id):
    if request.method == "PUT":
        user = request.user
        # Attempt to get the answer object.
        try:
            answer = Answer.objects.select_related('question').get(pk=answer_id)
        except Answer.DoesNotExist:
            return JsonResponse({"error": "No such Answer."}, status=404)

        # Check if there is a previous answer.
        if user.is_authenticated:
            # Get the previous selected answer id.
            data = json.loads(request.body)
            previous_answer_id = data.get('previous_answer_id')
            if previous_answer_id and int(previous_answer_id) != answer_id:
                try:
                    previous_answer = Answer.objects.get(pk=int(previous_answer_id))
                    previous_answer.selected_by.remove(user)
                except Answer.DoesNotExist:
                    return JsonResponse({"error": "Previous answer not found."}, status=404)

            # Add the user to the selected answers
            if not answer.selected_by.filter(pk=user.pk).exists():
                answer.selected_by.add(user)
            return HttpResponse(status=204)
        else:
            question = answer.question
            selected_answer = request.session["selected_answers"].get(str(question.id))
            if selected_answer:
                request.session["selected_answers"][str(question.id)] = None

            # Add the user to the selected answers
            selected_answers = request.session["selected_answers"]
            selected_answers[str(question.id)] = answer.serialize()

            # Update the session
            request.session["selected_answers"] = selected_answers
            return HttpResponse(status=204)

    else:
        return JsonResponse({"error": "Method Should be PUT."}, status=405)

def calculate_score(request):
    # Throw an error if the method isn't POST
    if request.method != "POST":
        return JsonResponse({"error": "POST method Allowed Only."}, status=405)

    # Grab the data from the request
    data = json.loads(request.body)
    quiz_id = data.get('quiz_id')
    selected_answers = data.get('selected_answers')

    # Attempt to get the quiz
    try:
        answers = Prefetch("answers", queryset=Answer.objects.order_by("timestamp"))
        questions_answers = Prefetch("questions", queryset=Question.objects.prefetch_related(answers).order_by("timestamp"))
        quiz = Quiz.objects.select_related("owner", "category").prefetch_related(questions_answers).get(pk=uuid.UUID(quiz_id))
    except Quiz.DoesNotExist:
        return JsonResponse({"error": "No Quiz."}, status=404)

    # Store the correct answers in a dict
    correct_answers = quiz.get_correct(quiz.questions.all())

    # Calculate the score then store it in database
    points = 0

    # Save the ids of the correct questions
    got_right = {}

    for q in quiz.questions.all():
        # Throw an error if the user hasn't answered all the questions
        if not selected_answers.get(str(q.id)):
            return JsonResponse({"error": "Must Answer all of the Questions"}, status=400)
        elif selected_answers.get(str(q.id))['id'] == correct_answers[q.id][0].id:
            got_right.update({q.id: True})
            points += q.points
        else:
            got_right.update({q.id: False})

    if not request.user.is_authenticated:
        # Save the score in the session
        request.session['scores'][str(quiz_id)] = points

        # Save the alterations to the session
        request.session.modified = True

        return JsonResponse({"message": f"your score is {points}", "points": points, "total": quiz.total_points, "correct": got_right}, status=201)

    try:
        score = QuizScore.objects.get(quiz=quiz, user=request.user)
        score.points = points
        score.save()
    except QuizScore.DoesNotExist:
        score = QuizScore(quiz=quiz, user=request.user, points=points)
        score.save()

    return JsonResponse({"message": f"your score is {points}", "points": points, "total": quiz.total_points, "correct": got_right}, status=201)

def validate_code(request):
    if request.method != "POST":
        return JsonResponse("POST request required.", status=405)
    quiz_title = request.POST.get("quiz_title")
    code = request.POST.get("code")
    if code:
        try:
            quiz = Quiz.objects.get(pk=code)
            if quiz.title == quiz_title:
                return HttpResponseRedirect(reverse("quiz:view_quiz", args=(code,)))
            else:
                return JsonResponse({"error":"Not the same Quiz."}, status=404)
        except (Quiz.DoesNotExist, ValueError, ValidationError) as e:
            return JsonResponse({"error" :"Code Error."}, status=404)


def ask_ai(request, question_id):
    prompt = Question.objects.get(pk=question_id).content
    result = call_groq(prompt)
    content = convert_to_HTML(result)
    print(content)
    return JsonResponse({"content":content}, status=201)

@login_required
def view_scores(request):
    user = request.user
    scores = QuizScore.objects.filter(user=user)
    return render(request, "quiz/scores.html", {
        "scores": scores
    })