function generatePassword() {
  const length = parseInt(document.getElementById("password-length").value);
  const useUppercase = document.getElementById("uppercase").checked;
  const useLowercase = document.getElementById("lowercase").checked;
  const useNumbers = document.getElementById("numbers").checked;
  const useSymbols = document.getElementById("symbols").checked;

  const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercaseChars = "abcdefghijklmnopqrstuvwxyz";
  const numberChars = "0123456789";
  const symbolChars = "!@#$%^&*()-_+=<>?";

  let validChars = "";

  if (useUppercase) validChars += uppercaseChars;
  if (useLowercase) validChars += lowercaseChars;
  if (useNumbers) validChars += numberChars;
  if (useSymbols) validChars += symbolChars;

  // Check if no checkboxes are selected
  if (!useUppercase && !useLowercase && !useNumbers && !useSymbols) {
    alert("Please select at least one option.");
    return;
  }

  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * validChars.length);
    password += validChars.charAt(randomIndex);
  }

  document.getElementById("password").value = password;
}

function copyToClipboard() {
  const passwordField = document.getElementById("password");
  passwordField.select();
  document.execCommand("copy");
  alert("Password copied");
}

function toggleCheckbox(id) {
  const checkbox = document.getElementById(id);
  checkbox.checked = !checkbox.checked;
}

function clearInputs() {
  document.getElementById("password-length").value = "";
  document
    .querySelectorAll(".options input[type='checkbox']")
    .forEach((checkbox) => {
      checkbox.checked = false;
    });
  document.getElementById("password").value = "";
}
