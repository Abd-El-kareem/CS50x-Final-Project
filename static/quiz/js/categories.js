const categoriesView = document.querySelector(".categories-view");
const quizzesView = document.querySelector(".quizzes-view");
const quizzesContainer = document.querySelector("#quizzes-container");
const backBtn = document.querySelector("#back-btn");

document.addEventListener("DOMContentLoaded", function () {
  document.addEventListener("click", handleExploreClick);
  backBtn.onclick = () => {
    updateViews();
  };
});

function handleExploreClick(event) {
  const exploreBtn = event.target.closest(".explore");
  if (!exploreBtn) return;

  const idAttr = exploreBtn.getAttribute("id");
  const categoryId = parseInt(idAttr.replace("explore-", ""));
  if (isNaN(categoryId)) {
    console.error("Invalid category ID:", idAttr);
    return;
  }

  loadQuizzes(categoryId);
}

function loadQuizzes(categoryId) {
  fetch(`load_quizzes/${categoryId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      return response.json();
    })
    .then((quizzes) => {
      updateViews();
      quizzesContainer.innerHTML = "<h4>No Quizzes.</h4>";
      if (quizzes["message"]) return;
      quizzesContainer.innerHTML = "";
      populateQuizzes(quizzes["quizzes"]);
    })
    .catch((error) => {
      console.error("Error loading quizzes:", error);
    });
}

function updateViews() {
  let categoriesDisplay = window.getComputedStyle(categoriesView).display;
  let viewsDisplay = window.getComputedStyle(quizzesView).display;
  categoriesView.style.display =
    categoriesDisplay === "none" ? "block" : "none";
  quizzesView.style.display = viewsDisplay === "none" ? "block" : "none";
}

function populateQuizzes(quizzes) {
  for (let i = 0; i < quizzes.length; i++) {
    let startBlock;
    console.log(quizzes[i]);
    if (quizzes[i].is_public || quizzes[i].owner === quizzes[i].user) {
      startBlock = `<li class="list-group-item"><a href="/view_quiz/${quizzes[i].id}" class="btn btn-outline" id="start-${quizzes[i].id}">Start</a></li>`;
    } else {
      startBlock = `<li class="list-group-item">
                    <form method="post" action="/validate_code" class="text-center">
                      <input type="hidden" name="csrfmiddlewaretoken" value="${getCookie(
                        "csrftoken"
                      )}">
                      <input type="hidden" name="quiz_title" value="${
                        quizzes[i].title
                      }">
                      <input type="text" class="form-control mb-3" name="code" required placeholder="Enter Quiz Code">
                      <input type="submit" class="btn main-btn" value="Start">
                    </form>
                </li>`;
    }
    const quizBlock = `<div class="card mb-3">
                        <div class="card-body text-center">
                            <h5 class="card-title">${quizzes[i].title}</h5>
                        </div>
                        <ul class="list-group list-group-flush">
                          <li class="list-group-item">${quizzes[i].questions_count} Questions</li>
                          <li class="list-group-item">${quizzes[i].total_points} Points</li>
                          <li class="list-group-item text-black-50">Created by: ${quizzes[i].owner}</li>
                          <li class="list-group-item text-black-50">Created On: ${quizzes[i].timestamp}</li>
                          ${startBlock}
                        </ul>
                    </div>`;
    quizzesContainer.insertAdjacentHTML("beforeend", quizBlock);
  }
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
