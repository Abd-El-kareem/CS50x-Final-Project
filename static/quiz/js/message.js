document.addEventListener("DOMContentLoaded", function () {
  let message = document.querySelector(".msg");
  if (message) {
    message.style.display = "block";
    message.style.animationPlayState = "running";
    message.addEventListener("animationend", function () {
      message.remove();
    });
  }
});
