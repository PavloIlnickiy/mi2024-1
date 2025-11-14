document.getElementById("eventForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const eventData = {
    title: document.getElementById("title").value.trim(),
    date_time: document.getElementById("date_time").value,
    description: document.getElementById("description").value.trim(),
    category: document.getElementById("category").value
  };

  document.getElementById("output").textContent = JSON.stringify(eventData, null, 2);
});
