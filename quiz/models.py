from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.db import models
import uuid

# Create your models here.

class User(AbstractUser):
    pass

    def __str__(self):
        return f"{self.username}"

class Category(models.Model):
    title = models.CharField(max_length=64)
    image = models.ImageField(upload_to='categories_images/', null=True)

    def serialize(self):
        return {"title": self.title, "image_url": self.image.url}

    def __str__(self):
        return f"{self.title} Category"

    class Meta:
        verbose_name_plural = "Categories"

class Quiz(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quizes")
    title = models.CharField(max_length=64)
    is_public = models.BooleanField(default=False)
    total_points = models.PositiveSmallIntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="quizes", blank=True, null=True, default=6)

    def save(self, *args, **kwargs):
        # Before saving, update total_points based on related questions
        if self.pk:  # ensure the object exists in DB (so related questions can be accessed)
            self.total_points = sum(q.points for q in self.questions.all())
        super().save(*args, **kwargs)

    def serialize(self, user=None, prefetched_questions=None):
        questions = prefetched_questions if prefetched_questions else self.questions.all()
        return {
            "id": self.id,
            "owner": self.owner.username,
            "title": self.title,
            "is_public": self.is_public,
            "timestamp": self.timestamp.strftime("%b %d %Y, %I:%M %p"),
            "questions": [q.serialize(q.answers.all()) for q in questions],
            "total": self.total_points,
            "selected_answers": {
                            q.id: q.user_answers[0].serialize() if q.user_answers else None
                            for q in questions
                        } if user else None,
            "category": self.category.serialize() if self.category else None,
            "score": QuizScore.objects.filter(user=user, quiz=self).first() if user else None
        }

    def get_correct(self, prefetched_questions=None):
        questions = prefetched_questions if prefetched_questions else self.questions.all()
        return {q.id: [a for a in q.answers.all() if a.is_correct]
            for q in questions}

    def __str__(self):
        return f"{self.title} Quiz"

    class Meta:
        verbose_name_plural = "Quizzes"

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    content = models.CharField(max_length=512, blank=False)
    points = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1)], blank=False)
    image = models.URLField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def serialize(self, prefetched_answers=None):
        answers = prefetched_answers if prefetched_answers else self.answers.all()
        return {
            "id": self.id,
            "content": self.content,
            "points": self.points,
            "image_url": self.image,
            "answers": [a.serialize() for a in answers],
            "timestamp": self.timestamp.strftime("%b %d %Y, %I:%M %p")
        }

    def __str__(self):
        return f"Question {self.id} in {self.quiz}"


class Answer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")
    content = models.CharField(max_length=512)
    is_correct = models.BooleanField()
    selected_by = models.ManyToManyField(User, related_name="selected_answers", blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def serialize(self):
        return {
            "id": self.id,
            "content": self.content,
            "is_correct": self.is_correct,
            "timestamp": self.timestamp.strftime("%b %d %Y, %I:%M %p")
        }

    def __str__(self):
        return f"Option for {self.question}"

class QuizScore(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="scores")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="scores")
    points = models.PositiveSmallIntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def serialize(self, user=None, quiz=None):
        user = user if user else self.user
        quiz = quiz if quiz else self.quiz
        return {
            "id": self.id,
            "user": user.username,
            "points": self.points,
            "total": quiz.total_points,
            "timestamp": self.timestamp.strftime("%b %d %Y, %I:%M %p")
        }

    def __str__(self):
        return f"{self.user} Scored {self.points} / {self.quiz.total_points} in {self.quiz.title} Quiz"