from django import forms
from django.forms import BaseInlineFormSet, inlineformset_factory
from django.core.exceptions import ValidationError
from django.contrib.auth.forms import AuthenticationForm
from .models import User, Quiz, Question, Answer
from django.contrib import messages
from .util import map_question_answer

class RegisterationForm(forms.ModelForm):
    password_confirmation = forms.CharField(label="Confirmation",max_length=128, widget=forms.PasswordInput(attrs={'class':'form-control', 'placeholder': 'Enter your password (again)'}))
    class Meta:
        model = User
        fields = ['username', 'password']
        labels = {
            'username': 'Username',
            'password': 'Password',
        }
        widgets = {
            'username': forms.TextInput(attrs={'class':'form-control','placeholder': 'Enter your Username'}),
            'password': forms.PasswordInput(attrs={'class':'form-control','placeholder': 'Enter you password'})
        } 

class LoginForm(AuthenticationForm):
    username = forms.CharField(label="Username", widget=forms.TextInput(attrs={'class':'form-control','placeholder': 'Enter your Username'}))
    password = forms.CharField(label="Password", widget=forms.PasswordInput(attrs={'class':'form-control','placeholder': 'Enter your password'}))

class QuizForm(forms.ModelForm):
    class Meta:
        model = Quiz
        fields = ['title', 'is_public', 'category']
        labels = {
            'title': 'Title',
            'is_public': 'Is_public',
            'category': 'Category'
        }
        widgets = {
            'title': forms.TextInput(attrs={'placeholder': "Title"})
        }

class QuestionForm(forms.ModelForm):
    class Meta:
        model = Question
        fields = ['content', 'points', 'image']
        labels = {
            'content': 'Content',
            'points': 'Points',
            'image': 'Image URL'
        }
        widgets = {
            'content': forms.Textarea(attrs={'placeholder': "Content", 'required': 'required'}),
            'points': forms.NumberInput(attrs={'required': 'required'}),
            'image': forms.TextInput(attrs={'placeholder': "Image URL (Optional)"})
        }        

class AnswerForm(forms.ModelForm):
    for_question_index = forms.IntegerField(initial=0, widget=forms.HiddenInput())
    class Meta: 
        model = Answer
        fields = ['content', 'is_correct']
        labels = {
            'content': 'Content',
            'is_correct': "Is_correct"
        }
        widgets = {
            'content': forms.Textarea(attrs={'placeholder': "Content", 'required': 'required'})
        }

class AnswerFormSetClass(BaseInlineFormSet):
    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)  # Pass request object to formset
        super().__init__(*args, **kwargs)

    def clean(self):
        super().clean()

        question_answer_mappings = map_question_answer(self.forms)
        values = list(question_answer_mappings.values())
        # Check that every question has at least two answers and a maximum of 4 answers.
        for set_of_answers in values:
            if int(len(set_of_answers)) < 2 or int(len(set_of_answers)) > 4:
                message = f"<p>Each Question Should have at least two answers and a maximum of four.<br> <a style='color: white' href='#answers-container-{set_of_answers[0].cleaned_data['for_question_index']}'>Check Question #{set_of_answers[0].cleaned_data['for_question_index'] + 1}  Answers.</a></p>"
                if self.request:
                    messages.error(self.request, message)
                    raise ValidationError("Each Question Should have at least two answers and a maximum of four.")
                    
        # Check that every question has only one correct answer.
        for set_of_answers in values:
            correct_answers_num = sum(1 for answer in set_of_answers if answer.cleaned_data.get("is_correct"))
            if correct_answers_num != 1:
                message = f"<p>Each question must have exactly one correct answer.<br> <a style='color: white' href='#answers-container-{set_of_answers[0].cleaned_data['for_question_index']}'>Check Question #{set_of_answers[0].cleaned_data['for_question_index'] + 1}  Answers.</a></p>"
                if self.request:
                    messages.error(self.request, message)
                    raise ValidationError("Each question must have exactly one correct answer.")
                
        # Check that each answer is unique.
        for set_of_answers in values:
            for i in range(0, len(set_of_answers)):
                current_content = set_of_answers[i].cleaned_data.get('content').strip()
                for answer in set_of_answers:
                    if answer == set_of_answers[i]:
                        continue
                    if answer.cleaned_data.get('content').strip() == current_content:
                        if self.request:
                            message = f"<p>Each Answer should be Unique.<br> <a style='color: white' href='#answers-container-{set_of_answers[0].cleaned_data['for_question_index']}'>Check Question #{set_of_answers[0].cleaned_data['for_question_index'] + 1}  Answers.</a></p>"
                            messages.error(self.request, message)
                            raise ValidationError("Each Answer should be Unique")

QuestionFormSet = inlineformset_factory(Quiz, Question, form=QuestionForm, extra=0, min_num=1, max_num=50, can_delete=False)
AnswerFormSet = inlineformset_factory(Question, Answer, form=AnswerForm, formset=AnswerFormSetClass, extra=0, min_num=2, max_num=200, can_delete=False)