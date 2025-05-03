(function () {
  // Save the needed HTML elements in variables for making changes
  const questionTracker = document.querySelector("#question-tracker");
  const categoryElement = document.querySelector("#category");
  const questionContent = document.querySelector("#question");
  const optionsContainer = document.querySelector("#answers-container");
  const buttonsContainer = document.querySelector("#buttons-container");
  const iconsContainer = document.querySelector("#icons");
  const prevBtn = document.querySelector("#previous");
  const nextBtn = document.querySelector("#next");
  const submitBtn = document.querySelector("#submit");
  const resultDiv = document.querySelector("#result");
  const message = document.querySelector(".msg");

  // Declare some needed variables to keep track of the question's details
  let questions;
  let category;
  let score = null;
  let selectedAnswers = {};
  let currentQIndex = 0;
  let renderedQIds = new Set();

  const COLORS = {
    correct: "var(--bs-success)",
    incorrect: "var(--bs-danger)",
    default: "var(--dark_color)",
    light: "var(--light_color)",
    hover: "var(--hover_color)",
  };

  // Get the quizId
  const quizId = document.querySelector(".quiz-view").id.slice(5);

  document.addEventListener("DOMContentLoaded", function () {
    // Call the API route to grab the quiz data
    fetch(`/quiz/${quizId}`)
      .then((response) => response.json())
      .then((data) => {
        // Save the needed data in the Variables
        questions = data.questions;
        category = data.category;
        selectedAnswers = data.selected_answers;
        score = data.score;

        // Initialize the quiz
        initializeQuiz();

        // Check if the user took the quiz before
        if (score !== null) {
          showMessage(
            "You have taken this quiz before. <br> Click on the icons below to check your answers."
          );
          submitQuiz(quizId, selectedAnswers);
          ReviewQuestion(
            0,
            questions[0].answers.find((a) => a.is_correct === true).id
          );
        }

        // Submit the quiz if the user clicked the submit btn.
        submitBtn.onclick = function () {
          let unansweredQs = [];
          // Check if the user answered all of the questions
          for (let i = 0; i < questions.length; i++) {
            if (!selectedAnswers[questions[i].id]) {
              unansweredQs.push(questions[i]);
            }
          }
          if (unansweredQs.length === 0) {
            showMessage("Quiz submitted Successfully.");
            submitQuiz(quizId, selectedAnswers);
          } else {
            showMessage("Answer all of the highlighted question below.");
            highlightUnanswered(unansweredQs);
            return;
          }

          // Show whether the last question correct or not as the user will be there when he submit the quiz.
          let lastQIndex = questions.length - 1;
          let correctAns = questions[questions.length - 1].answers.find(
            (a) => a.is_correct === true
          ).id;
          ReviewQuestion(lastQIndex, correctAns);
        };
      });

    function initializeQuiz() {
      document.querySelector("#ai-view").style.display = "none";
      document.querySelector("#feedback").style.display = "none";

      if (category) {
        categoryElement.innerHTML = category.title;
      } else {
        categoryElement.innerHTML = "No Category.";
      }

      // Load the Quiz content
      loadQuestion(currentQIndex);

      // Set up event listeners for navigation buttons
      prevBtn.addEventListener("click", () => {
        currentQIndex--;
        // Check if the quiz already submitted, use the buttons to toggle between the question's results.
        let correctAnsId = questions[currentQIndex].answers.find(
          (a) => a.is_correct === true
        ).id;
        if (score !== null) {
          loadQuestion(currentQIndex);
          ReviewQuestion(currentQIndex, correctAnsId);
          return;
        }

        // if not just load the question.
        loadQuestion(currentQIndex);
      });

      nextBtn.addEventListener("click", () => {
        currentQIndex++;
        // Check if the quiz already submitted, use the buttons to toggle between the question's results.
        let correctAnsId = questions[currentQIndex].answers.find(
          (a) => a.is_correct === true
        ).id;
        if (score !== null) {
          loadQuestion(currentQIndex);
          ReviewQuestion(currentQIndex, correctAnsId);
          return;
        }

        // if not just load the question.
        loadQuestion(currentQIndex);
      });
    }
  });

  function loadQuestion(index) {
    // Update the question Tracker
    questionTracker.innerHTML = `Question ${index + 1} of ${questions.length}`;

    // Update the question content
    let question = questions[index];
    questionContent.innerHTML = `<span class="d-block fs-6 text-white-50 text-start">${
      question.points
    } Points</span>
    <span class="fw-bold me-4 d-block">Question ${index + 1}</span>${
      question.content
    }`;
    questionContent.dataset.q_now = question.id;

    // Update the image if there is one
    if (question.image_url !== null) {
      document.querySelector("img").style.display = "block";
      document.querySelector("img").src = question.image_url;
    } else {
      document.querySelector("img").style.display = "none";
    }

    // Reset the options container then populate the current options
    optionsContainer.innerHTML = "";
    question.answers.forEach((answer) => {
      const option = document.createElement("div");
      option.className = "option p-4 rounded-4 fs-4 fw-medium m-auto";
      option.id = `option-${answer.id}`;
      option.innerHTML = answer.content;
      optionsContainer.appendChild(option);

      // Check if the user has selected this answer previously
      if (
        selectedAnswers[question.id] &&
        answer.id === selectedAnswers[question.id].id
      ) {
        populateAnswer(answer.id);
      }
    });

    const option = Array.from(
      optionsContainer.querySelectorAll(".option")
    ).find((option) => option.offsetHeight > 100);
    !option ? manipulateHeight() : manipulateHeight(option.offsetHeight);

    optionsContainer.addEventListener("click", handleOptionClick);

    // Update navigation buttons visibility
    updateNavigationButtons(index);
  }

  function handleOptionClick(event) {
    // Check if the user has clicked an option
    const option = event.target.closest(".option");
    if (!option) return;

    const answerId = parseInt(option.id.replace("option-", ""));
    const questionId = parseInt(questionContent.dataset.q_now);
    const answer = questions[currentQIndex].answers.find(
      (a) => a.id === answerId
    );

    selectAnswer(answerId);

    // Update selected answers in local state
    selectedAnswers[questionId] = answer;

    // Remove the icon if any
    let icon = document.querySelector(`#icon-${questionId}`);
    console.log(`icon => ${icon}`);
    if (icon) icon.remove();
  }

  function populateAnswer(selectedAnsId) {
    // change the color of the option element
    document.querySelectorAll(".option").forEach((option) => {
      // Reset the color of all options
      option.style.backgroundColor = COLORS.hover;
      option.style.color = COLORS.default;

      if (parseInt(option.id.slice(7)) === selectedAnsId) {
        option.style.backgroundColor = COLORS.default;
        option.style.color = COLORS.hover;
      }
    });
  }

  function selectAnswer(answerId) {
    // Update the selection in the front-end
    populateAnswer(answerId);

    // Send PUT request to update answer
    updateAnswerInBackend(answerId);
  }

  function updateAnswerInBackend(answerId) {
    // Check if there is a previous answer that user has selected
    let selectedAnswerId;
    selectedAnswers[questions[currentQIndex].id] !== null
      ? (selectedAnswerId = selectedAnswers[questions[currentQIndex].id].id)
      : (selectedAnswerId = null);

    fetch(`/update_answer/${answerId}`, {
      method: "PUT",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        previous_answer_id: selectedAnswerId,
      }),
    })
      .then(() => {
        console.log("Answer updated successfully:");
      })
      .catch((error) => {
        console.error("Error updating answer:", error);
      });
  }

  function updateNavigationButtons(currentIndex) {
    let totalQuestions = questions.length;
    prevBtn.style.display = currentIndex === 0 ? "none" : "block";
    nextBtn.style.display =
      currentIndex === totalQuestions - 1 ? "none" : "block";
    submitBtn.style.display =
      currentIndex === totalQuestions - 1 ? "block" : "none";
  }

  function submitQuiz(quizId, selectedAnswers) {
    // View the feedback from Ai
    document.querySelector("#ai-view").style.display = "block";
    document.querySelector("#feedback").style.display = "block";

    // Send a POST request to the API route
    fetch("/calculate_score", {
      method: "POST",
      headers: {
        "X-CSRFToken": getCookie("csrftoken"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quiz_id: quizId,
        selected_answers: selectedAnswers,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        score = data.points;
        let points = data.points;
        let total = data.total;
        displayResult(points, total, questions, data.correct);
      });
  }

  function displayResult(points, total, questions, correctAnsIds) {
    resultDiv.innerHTML = `You've Got ${points} out of ${total}`;

    // Create a little icon for each question to allow the users to review thier answers.
    for (let i = 0; i < questions.length; i++) {
      const questionBadge = document.createElement("div");
      questionBadge.innerHTML = i + 1;
      questionBadge.id = `badge-${questions[i].id}`;
      questionBadge.classList.add(
        "q-badge",
        `col-1`,
        "text-center",
        "rounded-2"
      );
      iconsContainer.classList.add("row", "gap-2", "justify-content-center");
      iconsContainer.append(questionBadge);

      // When the user hover over the icon color it with green color if his answer was right or with red color if the answer was false.
      questionBadge.addEventListener("mouseover", function () {
        this.style.backgroundColor =
          correctAnsIds[questions[i].id] === true
            ? COLORS.correct
            : COLORS.incorrect;
      });
      questionBadge.addEventListener("mouseout", function () {
        this.style.backgroundColor = COLORS.default;
      });
    }

    // When the user clicks the icon review the question.
    document.querySelectorAll(".q-badge").forEach((badge) => {
      badge.onclick = () => {
        const qIndex = parseInt(badge.innerHTML) - 1;
        const correctAnswerId = questions[qIndex].answers.find(
          (a) => a.is_correct === true
        ).id;
        currentQIndex = qIndex;
        loadQuestion(currentQIndex);
        ReviewQuestion(qIndex, correctAnswerId);
      };
    });
  }

  function ReviewQuestion(qIndex, correctAnsId) {
    // disable selecting answers while displaying the result
    preventSelection();

    // Change the background color of the correct answer to green.
    const selectedAnsId = selectedAnswers[questions[qIndex].id].id;
    document.querySelector(`#option-${correctAnsId}`).style.backgroundColor =
      COLORS.correct;
    document.querySelector(`#option-${correctAnsId}`).style.color =
      COLORS.light;

    // If the user's answer is false say so.
    if (correctAnsId !== selectedAnsId) {
      document.querySelector(`#option-${selectedAnsId}`).style.backgroundColor =
        COLORS.incorrect;
      document.querySelector(`#option-${selectedAnsId}`).style.color =
        COLORS.light;
    }

    document.querySelector("#ai-content").innerHTML = "";

    document.querySelector("#feedback").onclick = () => {
      aiFeedback(questions[qIndex].id);
    };
  }

  function highlightUnanswered(unansweredQs) {
    // Create a little icon for each question to allow the users to review thier answers.
    unansweredQs.forEach((q) => {
      if (renderedQIds.has(q.id)) return;
      renderedQIds.add(q.id);
      const questionIcon = document.createElement("div");
      questionIcon.innerHTML = questions.indexOf(q) + 1;
      questionIcon.id = `icon-${q.id}`;
      questionIcon.classList.add(
        "q-icon",
        `col-1`,
        "text-center",
        "rounded-2",
        "btn",
        "btn-outline-warning"
      );
      iconsContainer.classList.add("row", "gap-2", "justify-content-center");
      iconsContainer.append(questionIcon);

      // when the user clicks on the icon it takes him to the needed to answer question.
      questionIcon.onclick = () => {
        currentQIndex = parseInt(questionIcon.innerHTML) - 1;
        loadQuestion(currentQIndex);
      };
    });
  }

  function aiFeedback(questionId) {
    fetch(`/ask_ai/${questionId}`)
      .then((response) => response.json())
      .then((data) => {
        let content = data.content;
        document.querySelector("#ai-content").innerHTML = content;
      });
  }

  function preventSelection() {
    options = document.querySelectorAll(".option");
    options.forEach((option) => {
      option.style.pointerEvents = "none";
    });
    submitBtn.style.display = "none";
  }

  function showMessage(text) {
    message.innerHTML = `${text}`;
    message.style.display = "block";
    message.style.animationPlayState = "running";
    message.addEventListener("animationend", function () {
      message.style.display = "none";
    });
  }

  function manipulateHeight(optionHeight = 0) {
    console.log(optionHeight);
    optionsContainer.style.gridTemplateColumns =
      optionHeight > 100 ? "none" : "1fr 1fr";
  }

  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
})();
