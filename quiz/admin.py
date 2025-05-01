from django.contrib import admin
from .models import User, Category, Quiz, Question, Answer, QuizScore

# Register your models here.

class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username')

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'image')

class QuizAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'total_points', 'is_public', 'category', 'timestamp')

class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'quiz', 'content', 'timestamp')

class AnswerAdmin(admin.ModelAdmin):
    list_display = ('id', 'question', 'content', 'is_correct','timestamp')

class QuizScoreAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'id', 'points','timestamp')

admin.site.register(User, UserAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(Quiz, QuizAdmin)
admin.site.register(Question, QuestionAdmin)
admin.site.register(Answer, AnswerAdmin)
admin.site.register(QuizScore, QuizScoreAdmin)