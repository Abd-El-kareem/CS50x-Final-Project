// ===== DOM Elements =====
const questionsContainer = document.querySelector("#questions-container");
const cleanQForm = document.querySelector("#id_questions-0-accordion");
const cleanAForm = document.querySelector("#id_answers-0-accordion");
const cleanAContainer = document.querySelector("#answers-container-0");
const addQBtn = document.querySelector("#add-Q-btn");
const totalQForms = document.getElementById("id_questions-TOTAL_FORMS");
const totalAForms = document.getElementById("id_answers-TOTAL_FORMS");
let questionsCount = parseInt(totalQForms.value);
let answersCount = parseInt(totalAForms.value);

// ===== Helping Variables =====
const MAX_QUESTIONS = 50;
const MAX_ANSWERS_PER_QUESTION = 4;
const MIN_ANSWERS_PER_QUESTION = 2;

document.addEventListener("DOMContentLoaded", function () {
  addQBtn.addEventListener("click", addNewQuestion);
  // Question Container EventListeners.
  questionsContainer.addEventListener("click", (event) => {
    const removeBtn = event.target.closest(".remove-question");
    if (removeBtn) {
      handleRemoveQClick(event);
    }

    const addABtn = event.target.closest(".add-answer");
    if (addABtn) {
      handleAddAClick(event);
    }

    const removeABtn = event.target.closest(".remove-answer");
    if (removeABtn) {
      handleRemoveAClick(event);
    }
  });
  updateQAddButton();
  updateQRemoveButton();
  document
    .querySelectorAll('[id^="answers-container"]')
    .forEach((container) => {
      updateARemoveButtons(container);
    });
});

// ===== Event Handlers =====
function addNewQuestion() {
  if (questionsCount >= 50) return;

  const newQuestionForm = cleanQForm.cloneNode(true);

  // Update all field names/IDs with new index increased by one.
  updateElementIds(newQuestionForm, "questions", questionsCount);

  // Update the answers-container data.
  const newAnswersContainer =
    newQuestionForm.querySelector(".answers-container");
  newAnswersContainer.dataset.question_index = questionsCount;
  newAnswersContainer.id = `answers-container-${questionsCount}`;

  // Remove the previous answer forms.
  const answerAccordions = newAnswersContainer.querySelectorAll(".accordion");
  answerAccordions.forEach((accordion) => {
    accordion.remove();
  });

  // Create a couple of new clean answer forms.
  for (let i = 0; i < MIN_ANSWERS_PER_QUESTION; i++) {
    const newAnswerForm = cleanAForm.cloneNode(true);
    addAnswer(newAnswersContainer, newAnswerForm);
  }

  // Update the questions container and the number of forms in the formset management.
  resetFormFields(newQuestionForm);
  questionsContainer.insertBefore(newQuestionForm, addQBtn);
  questionsCount++;
  updateAccordionTitle(newQuestionForm, "question", questionsCount);
  updateTotalForms();
  updateQAddButton();
  updateQRemoveButton();
  updateARemoveButtons(newQuestionForm.querySelector(".answers-container"));
}

function handleRemoveQClick(event) {
  const removeBtn = event.target.closest(".remove-question");
  if (questionsCount === 1) return;

  const qForm = removeBtn.closest(".accordion");
  let idNum = parseInt(qForm.dataset.id_num);
  const qAnswers = qForm.querySelectorAll(".a-accordion");
  // Repeative Code
  qAnswers.forEach((answer) => {
    removeAnswer(answer);
  });
  qForm.remove();

  // Update all the quesions forms field's names/IDs after the deleted one with new index decreased by one.
  const forms = [...questionsContainer.querySelectorAll(".q-accordion")].filter(
    (form) => parseInt(form.dataset.id_num) > idNum
  );
  forms.forEach((form) => {
    let formIdNum = parseInt(form.dataset.id_num);
    updateElementIds(form, "questions", formIdNum - 1);
    updateAccordionTitle(form, "question", formIdNum);
  });

  // Handle the total number of questions and answers Correctly.
  questionsCount--;
  updateTotalForms();
  updateQAddButton();
  updateQRemoveButton();
}

function handleAddAClick(event) {
  const addABtn = event.target.closest(".add-answer");
  const answersContainer = addABtn.parentElement;
  if (answersContainer.querySelectorAll(".a-accordion").length >= 4) return;
  const newAnswerForm = cleanAForm.cloneNode(true);
  addAnswer(answersContainer, newAnswerForm);
  updateARemoveButtons(answersContainer);
}

function handleRemoveAClick(event) {
  const removeBtn = event.target.closest(".remove-answer");
  const answersContainer = removeBtn.closest(".answers-container");
  if (
    answersContainer.querySelectorAll(".a-accordion").length <=
    MIN_ANSWERS_PER_QUESTION
  )
    return;
  const answerAccordion = removeBtn.closest(".accordion");
  let idNum = parseInt(answerAccordion.dataset.id_num);

  // Update all of the headings in the forms after the deleted one.
  console.log(
    [...answersContainer.querySelectorAll(".a-accordion")].filter(
      (accordion) => parseInt(accordion.dataset.id_num) > idNum
    )
  );
  [...answersContainer.querySelectorAll(".a-accordion")]
    .filter((accordion) => parseInt(accordion.dataset.id_num) > idNum)
    .forEach((accordion) => {
      let index =
        parseInt(
          accordion
            .querySelector(".accordion-button")
            .innerHTML.trim()
            .slice(-1)
        ) - 1;
      console.log(index);
      updateAccordionTitle(accordion, "answer", index);
    });

  // Make sure the add answer is displayed.
  answersContainer.querySelector(".add-answer").style.display = "block";

  removeAnswer(answerAccordion);
  updateARemoveButtons(answersContainer);
}

// ===== Answer Logic =====
function addAnswer(answersContainer, newAnswerForm) {
  const addABtn = answersContainer.querySelector(".add-answer");

  updateElementIds(newAnswerForm, "answers", answersCount);

  // Update the dataset to have the id number.
  newAnswerForm.dataset.id_num = answersCount;

  // Update the for_question field that associated to the answer to detect which answer it belongs to
  const questionIndex = parseInt(answersContainer.dataset.question_index);
  newAnswerForm.querySelector(
    `#id_answers-${answersCount}-for_question_index`
  ).value = questionIndex;

  // Change the Headings to make it user-friendly.
  let numberOfAnswers =
    answersContainer.querySelectorAll(".answer-form").length;
  updateAccordionTitle(newAnswerForm, "answer", numberOfAnswers + 1);

  // Add the new answer to the answers container then update the total number of answers in the formset management.
  resetFormFields(newAnswerForm);
  answersContainer.insertBefore(newAnswerForm, addABtn);
  answersCount++;
  updateTotalForms();

  // After adding the answer check if the answers count reached the maximum limit which is 4.
  if (answersContainer.querySelectorAll(".answer-form").length === 4) {
    addABtn.style.display = "none";
  }
}

function removeAnswer(answerAccordion) {
  let idNum = parseInt(answerAccordion.dataset.id_num);
  answerAccordion.remove();
  // Chango all the answers that created after the deleted one and decrease their IDs/Names by one.
  const answerAccordions = [
    ...document.querySelectorAll(".a-accordion"),
  ].filter((accordion) => parseInt(accordion.dataset.id_num) > idNum);
  answerAccordions.forEach((accordion) => {
    let formIdNum = parseInt(accordion.dataset.id_num);
    updateElementIds(accordion, "answers", formIdNum - 1);
  });
  answersCount--;
  updateTotalForms();
}

// ===== DOM Helpers =====
function updateElementIds(accordion, prefix, value) {
  // Create a regular expression to match the form prefix and index.
  const formRegex = new RegExp(`${prefix}-(\\d+)-`, "g");
  // Replace the old index with the new index in the accordion's and innerHTML's IDs.
  accordion.id = accordion.id.replace(formRegex, `${prefix}-${value}-`);
  accordion.innerHTML = accordion.innerHTML.replace(
    formRegex,
    `${prefix}-${value}-`
  );
  accordion.dataset.id_num = value;

  if (prefix === "questions") {
    accordion.querySelector(".answers-container").dataset.question_index =
      value;
    accordion.querySelectorAll(".answer-form").forEach((form) => {
      // Update the for_question field that associated to the answer to detect which answer it belongs to
      form.querySelector('[name$="for_question_index"]').value = value;
    });
  }
}

function updateAccordionTitle(form, prefix, value) {
  let text = `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} #${value}`;
  console.log(text);
  form.querySelector(`.${prefix}-num`).innerHTML = text;
  form.querySelector(".accordion-button").innerHTML = text;
}

function updateQAddButton() {
  if (questionsCount >= 50) {
    addQBtn.style.display = "none";
  } else {
    addQBtn.style.display = "block";
  }
}

function updateQRemoveButton() {
  const buttons = document.querySelectorAll(".remove-question");
  if (questionsCount > 1) {
    buttons.forEach((button) => {
      button.style.display = "block";
    });
  } else {
    buttons.forEach((button) => {
      button.style.display = "none";
    });
  }
}

function updateARemoveButtons(answersContainer) {
  const buttons = answersContainer.querySelectorAll(".remove-answer");
  if (buttons.length > MIN_ANSWERS_PER_QUESTION) {
    buttons.forEach((button) => {
      button.style.display = "block";
    });
  } else {
    buttons.forEach((button) => {
      button.style.display = "none";
    });
  }
}

function updateTotalForms() {
  totalQForms.value = questionsCount;
  totalAForms.value = answersCount;
}

function resetFormFields(form) {
  const inputs = form.querySelectorAll("input");
  inputs.forEach((input) => {
    if (
      input.name !== "csrfmiddlewaretoken" &&
      input.type !== "hidden" &&
      input.type !== "checkbox"
    ) {
      input.value = "";
    }
  });
}
