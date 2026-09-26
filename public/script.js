let first = document.querySelector(".f_name");
let last = document.querySelector(".l_name");
let select = document.querySelector(".select");
let save = document.querySelector(".save");
let table = document.querySelector(".table");
let timer = document.querySelector(".timer");
let firstMessage = document.querySelector(".firstMessage");
let lastMessage = document.querySelector(".lastMessage");
let search = document.querySelector(".search");
let searchResults = document.querySelector(".search-results");
let deleteAllButton = document.querySelector(".delete-all");
let userCount = document.querySelector(".user-count");
let duplicateMessage = document.querySelector(".duplicate-message");
let genderFilter = document.querySelector(".gender-filter");
let deleteDialog = document.querySelector(".delete-dialog");
let deleteMessage = document.querySelector(".delete-message");
let cancelDeleteButton = document.querySelector(".cancel-delete");
let confirmDeleteButton = document.querySelector(".confirm-delete");
let userStatistics = document.querySelector(".user-statistics");
let previousButton = document.querySelector(".previous-page");
let nextButton = document.querySelector(".next-page");
let pageNumbers = document.querySelector(".page-numbers");

/////////////////////////

let gender = "";
let usersList;
let userId;
let firstNameAscending = true;
let lastNameAscending = true;
let sortField = "";
let sortAscending = true;
let countdown;
let userToDelete = null;
let currentPage = 1;
let usersPerPage = 5;

////////////////////////

async function getUser() {
  const response = await fetch("/users");
  const data = await response.json();
  usersList = data;
  console.log("whatever", usersList);
}

async function createUsers(user) {
  const response = await fetch("/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(user),
  });

  const data = await response.json();

  return data.id;
}
async function updateUser(userID, userObject) {
  await fetch(`/users/${userID}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userObject),
  });
}
async function deleteUser(userID) {
  await fetch(`/users/${userID}`, {
    method: "DELETE",
  });
}
async function deleteAllUsers() {
  await fetch("/users", {
    method: "DELETE",
  });
}
/////////////////////////////////////

if (!Array.isArray(usersList)) {
  usersList = [];
}

select.addEventListener("change", (event) => {
  gender = event.target.value;
});

window.addEventListener("change", () => {
  save.disabled = !(first.value !== "" && last.value !== "" && gender);
});

first.addEventListener("input", () => {
  if (first.value.length > 0 && first.value.length < 3) {
    firstMessage.textContent = "Min 3 chars";
    first.classList.add("warning");
  } else {
    firstMessage.textContent = "";
    first.classList.remove("warning");
  }
});

last.addEventListener("input", () => {
  if (last.value.length > 0 && last.value.length < 3) {
    lastMessage.textContent = "Min 3 chars";
    last.classList.add("warning");
  } else {
    lastMessage.textContent = "";
    last.classList.remove("warning");
  }
});

save.addEventListener("click", () => {
  if (!LocalSave()) {
    return;
  }

  updateFilters();
  startTimer();

  first.value = "";
  last.value = "";
  select.value = "";
  gender = "";
  save.disabled = true;
});

async function LocalSave() {
  let firstName = first.value.trim();
  let lastName = last.value.trim();

  if (userExists(firstName, lastName)) {
    duplicateMessage.textContent = "This user already exists.";
    return false;
  }

  duplicateMessage.textContent = "";

  let users = {
    firstname: firstName,
    lastName: lastName,
    gender: gender,
  };

  usersList.push(users);
  await createUsers(users);

  return true;
}

function getFilteredUsers() {
  let searchValue = search.value.trim().toLowerCase();
  let selectedGender = genderFilter.value;

  let filteredUsers = usersList.filter((user) => {
    let matchesSearch = user.firstname.toLowerCase().startsWith(searchValue);

    let matchesGender =
      selectedGender === "all" || user.gender === selectedGender;

    return matchesSearch && matchesGender;
  });

  if (sortField !== "") {
    filteredUsers.sort((a, b) => {
      if (sortAscending) {
        return a[sortField].localeCompare(b[sortField]);
      }

      return b[sortField].localeCompare(a[sortField]);
    });
  }

  return filteredUsers;
}

function updateFilters() {
  let filteredUsers = getFilteredUsers();

  updatePagination(filteredUsers.length);

  let startIndex = (currentPage - 1) * usersPerPage;

  let pageUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);

  createUser(pageUsers);
  renderSearchResults(pageUsers);
}

function updatePagination(totalUsers) {
  let totalPages = Math.ceil(totalUsers / usersPerPage);

  currentPage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));

  previousButton.disabled = currentPage === 1;
  nextButton.disabled = totalPages === 0 || currentPage === totalPages;

  pageNumbers.innerHTML = "";

  for (let page = 1; page <= totalPages; page++) {
    let pageButton = document.createElement("button");

    pageButton.type = "button";
    pageButton.textContent = page;
    pageButton.setAttribute("aria-label", `Page ${page}`);

    if (page === currentPage) {
      pageButton.className = "active-page";
      pageButton.setAttribute("aria-current", "page");
    }

    pageButton.addEventListener("click", () => {
      currentPage = page;
      updateFilters();
    });

    pageNumbers.appendChild(pageButton);
  }
}

previousButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    updateFilters();
  }
});

nextButton.addEventListener("click", () => {
  let totalPages = Math.ceil(getFilteredUsers().length / usersPerPage);

  if (currentPage < totalPages) {
    currentPage++;
    updateFilters();
  }
});

function handleFilterChange() {
  currentPage = 1;
  updateFilters();
}

search.addEventListener("input", handleFilterChange);
genderFilter.addEventListener("change", handleFilterChange);

function createUser(pageUsers) {
  table.innerHTML = "";
  updateUserCount();

  let headerRow = document.createElement("tr");

  let firstHeader = document.createElement("th");
  firstHeader.textContent = "firstname";
  firstHeader.scope = "col";
  firstHeader.style.cursor = "pointer";
  firstHeader.tabIndex = 0;

  let lastHeader = document.createElement("th");
  lastHeader.textContent = "lastname";
  lastHeader.scope = "col";
  lastHeader.style.cursor = "pointer";
  lastHeader.tabIndex = 0;

  let genderHeader = document.createElement("th");
  genderHeader.textContent = "gender";
  genderHeader.scope = "col";

  let deleteHeader = document.createElement("th");
  deleteHeader.textContent = "delete";
  deleteHeader.scope = "col";

  let editHeader = document.createElement("th");
  editHeader.textContent = "edit";
  editHeader.scope = "col";

  if (sortField !== "") {
    let sortedHeader = sortField === "firstname" ? firstHeader : lastHeader;

    sortedHeader.setAttribute(
      "data-sort",
      sortAscending ? "ascending" : "descending",
    );
  }

  headerRow.appendChild(firstHeader);
  headerRow.appendChild(lastHeader);
  headerRow.appendChild(genderHeader);
  headerRow.appendChild(deleteHeader);
  headerRow.appendChild(editHeader);

  table.appendChild(headerRow);

  firstHeader.addEventListener("click", () => {
    sortField = "firstname";
    sortAscending = firstNameAscending;
    firstNameAscending = !firstNameAscending;

    currentPage = 1;
    updateFilters();
  });

  lastHeader.addEventListener("click", () => {
    sortField = "lastName";
    sortAscending = lastNameAscending;
    lastNameAscending = !lastNameAscending;

    currentPage = 1;
    updateFilters();
  });

  [firstHeader, lastHeader].forEach((header) => {
    header.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        header.click();
      }
    });
  });

  if (pageUsers.length === 0) {
    let emptyRow = document.createElement("tr");
    let emptyCell = document.createElement("td");

    emptyCell.colSpan = 5;
    emptyCell.textContent =
      usersList.length === 0 ? "No users yet." : "No matching users.";

    emptyRow.appendChild(emptyCell);
    table.appendChild(emptyRow);

    return;
  }

  pageUsers.forEach((user) => {
    let tableRow = document.createElement("tr");
    tableRow.className = "user-row";

    let firstTd = document.createElement("td");
    firstTd.textContent = user.firstname;

    let lastTd = document.createElement("td");
    lastTd.textContent = user.lastName;

    let genderTd = document.createElement("td");
    genderTd.textContent = user.gender;

    let deleteTd = document.createElement("td");

    let deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "delete";
    deleteButton.className = "deleteBtn Btn";

    deleteTd.appendChild(deleteButton);

    let editTd = document.createElement("td");

    let editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "edit";
    editButton.className = "editBtn";

    editTd.appendChild(editButton);

    tableRow.appendChild(firstTd);
    tableRow.appendChild(lastTd);
    tableRow.appendChild(genderTd);
    tableRow.appendChild(deleteTd);
    tableRow.appendChild(editTd);

    deleteButton.addEventListener("click", () => {
      userToDelete = user;

      deleteMessage.textContent = `Are you sure you want to delete ${user.firstname} ${user.lastName}?`;

      clearInterval(countdown);
      timer.textContent = "Countdown paused";

      deleteDialog.showModal();
    });

    editButton.addEventListener("click", () => {
      let firstInput = document.createElement("input");
      firstInput.value = user.firstname;
      firstInput.setAttribute("aria-label", "First name");

      let lastInput = document.createElement("input");
      lastInput.value = user.lastName;
      lastInput.setAttribute("aria-label", "Last name");

      firstTd.textContent = "";
      lastTd.textContent = "";

      firstTd.appendChild(firstInput);
      lastTd.appendChild(lastInput);

      firstInput.focus();

      let editSaveButton = document.createElement("button");
      editSaveButton.type = "button";
      editSaveButton.textContent = "save";
      editSaveButton.className = "editBtn";

      editTd.innerHTML = "";
      editTd.appendChild(editSaveButton);

      editSaveButton.addEventListener("click", async () => {
        let firstName = firstInput.value.trim();
        let lastName = lastInput.value.trim();
        let index = usersList.indexOf(user);

        if (index === -1) {
          updateFilters();
          return;
        }

        if (userExists(firstName, lastName, index)) {
          duplicateMessage.textContent = "This user already exists.";
          return;
        }
        usersList[index].firstname = firstName;
        usersList[index].lastName = lastName;
        const { _id, ...updatedUser } = usersList[index];

        await updateUser(_id, updatedUser);
        duplicateMessage.textContent = "";

        updateFilters();
        startTimer();
      });
    });

    table.appendChild(tableRow);
  });
}

function renderSearchResults(pageUsers) {
  searchResults.innerHTML = "";

  if (search.value.trim() === "" || pageUsers.length === 0) {
    searchResults.style.display = "none";
    return;
  }

  pageUsers.forEach((user) => {
    let result = document.createElement("p");

    result.className = "search-result";
    result.textContent = `${user.firstname} ${user.lastName}`;

    searchResults.appendChild(result);
  });

  searchResults.style.display = "block";
}

function updateUserCount() {
  let maleCount = usersList.filter((user) => {
    return user.gender === "male";
  }).length;

  let femaleCount = usersList.filter((user) => {
    return user.gender === "female";
  }).length;

  userCount.textContent = `Total users: ${usersList.length}`;

  userStatistics.textContent = `Male: ${maleCount} · Female: ${femaleCount}`;
}

cancelDeleteButton.addEventListener("click", () => {
  deleteDialog.close();
});
confirmDeleteButton.addEventListener("click", async () => {
  let index = usersList.indexOf(userToDelete);

  if (index !== -1) {
    const userID = usersList[index]._id;

    await deleteUser(userID);

    usersList.splice(index, 1);
  }

  updateFilters();
  deleteDialog.close();
});

deleteDialog.addEventListener("close", () => {
  userToDelete = null;
  startTimer();
});

deleteAllButton.addEventListener("click", async () => {
  await deleteAllUsers();
  usersList.length = 0;
  currentPage = 1;

  updateFilters();

  clearInterval(countdown);
  timer.textContent = "";
});

function userExists(firstName, lastName, ignoredIndex = -1) {
  return usersList.some((user, index) => {
    return (
      index !== ignoredIndex &&
      user.firstname.trim().toLowerCase() === firstName.trim().toLowerCase() &&
      user.lastName.trim().toLowerCase() === lastName.trim().toLowerCase()
    );
  });
}

function startTimer() {
  clearInterval(countdown);

  if (usersList.length === 0) {
    timer.textContent = "";
    return;
  }

  let i = 200;

  timer.textContent = `The local storage will get deleted in ${i}`;

  countdown = setInterval(async () => {
    i--;

    timer.textContent = `The local storage will get deleted in ${i}`;

    if (i <= 0) {
      clearInterval(countdown);
      await deleteAllUsers();

      usersList = [];
      currentPage = 1;

      updateFilters();

      timer.textContent = "All users deleted from the database";
    }
  }, 1000);
}

async function startApp() {
  await getUser();
  updateFilters();
  startTimer();
}
startApp();
