from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from . import views

app_name = 'quiz'
urlpatterns = [
    path('', views.index, name="index"),
    path('login', views.login_view, name="login"),
    path('logout', views.logout_view, name="logout"),
    path('register', views.register, name="register"),
    path('view_quiz/<uuid:quiz_id>', views.view_quiz, name="view_quiz"),
    path('categories', views.view_categories, name="categories"),
    path('create', views.create_quiz, name="create"),
    path('validate_code', views.validate_code, name="validate_code"),
    path('view_scores', views.view_scores, name="view_scores"),

    # API Routes
    path('load_quizzes/<int:category_id>', views.load_quizzes, name="load_quizzes"),
    path('quiz/<uuid:quiz_id>', views.quiz, name="quiz"),
    path('update_answer/<int:answer_id>', views.update_answer, name="update_answer"),
    path('calculate_score', views.calculate_score, name="calculate_score"),
    path('ask_ai/<int:question_id>', views.ask_ai, name="ask_ai")
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)