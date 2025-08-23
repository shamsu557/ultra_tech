document.addEventListener("DOMContentLoaded", () => {
  // Validate email format
  function isValidEmail(email) {
    return /^[^@]+@[^@]+\.[^@]+$/.test(email);
  }

  // Validate Nigerian phone number
  function isValidPhone(phone) {
    return /^(\+234|0)[789][0-1][0-9]{8}$/.test(phone);
  }

  // Highlight invalid field
  function highlightInvalidField(field, message) {
    field.classList.add("is-invalid");
    const errorDiv = field.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains("invalid-feedback")) {
      errorDiv.textContent = message;
    }
  }

  // Reset field validation
  function resetField(field) {
    field.classList.remove("is-invalid");
    const errorDiv = field.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains("invalid-feedback")) {
      errorDiv.textContent = "";
    }
  }

  // Show alert message
  function showMessage(message, type) {
    const alertContainer = document.getElementById("alertContainer");
    alertContainer.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
  }

  // Set button loading state
  function setLoadingState(button, isLoading, originalText) {
    if (isLoading) {
      button.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
      button.disabled = true;
    } else {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  // Load courses
  async function loadCourses() {
    const courseSelect = document.getElementById("courseId");
    try {
      const response = await fetch("/api/courses");
      const courses = await response.json();
      courseSelect.innerHTML = '<option value="">Select a course</option>';
      courses.forEach((course) => {
        courseSelect.innerHTML += `<option value="${course.id}">${course.name} (${course.duration})</option>`;
      });
    } catch (error) {
      console.error("Error loading courses:", error);
      courseSelect.innerHTML = '<option value="">Error loading courses</option>';
      showMessage("Failed to load courses. Please refresh the page.", "danger");
    }
  }

  // Restrict schedule based on course
  function restrictSchedule() {
    const courseSelect = document.getElementById("courseId");
    const scheduleSelect = document.getElementById("schedule");
    const scheduleNote = document.getElementById("scheduleNote");
    courseSelect.addEventListener("change", () => {
      const courseName = courseSelect.options[courseSelect.selectedIndex]?.text || "";
      if (courseName.includes("Web Development") || courseName.includes("Artificial Intelligence")) {
        scheduleSelect.innerHTML = '<option value="">Select Schedule</option><option value="weekend">Weekend Classes</option>';
        scheduleNote.textContent = "Note: This course is only available on weekends.";
      } else {
        scheduleSelect.innerHTML = `
          <option value="">Select Schedule</option>
          <option value="morning">Morning Classes</option>
          <option value="evening">Evening Classes</option>
          <option value="weekend">Weekend Classes</option>`;
        scheduleNote.textContent = "";
      }
    });
  }

  // Validate form
  function validateApplicationForm() {
    const fields = [
      { id: "firstName", message: "Please enter your first name" },
      { id: "lastName", message: "Please enter your last name" },
      { id: "email", message: "Please enter a valid email address", validate: isValidEmail },
      { id: "phone", message: "Please enter a valid Nigerian phone number", validate: isValidPhone },
      { id: "gender", message: "Please select your gender" },
      { id: "dateOfBirth", message: "Please enter your date of birth" },
      { id: "address", message: "Please enter your address" },
      { id: "courseId", message: "Please select a course" },
      { id: "schedule", message: "Please select a schedule" },
    ];

    let isValid = true;
    fields.forEach(({ id, message, validate }) => {
      const field = document.getElementById(id);
      const value = field.value.trim();
      if (!value || (validate && !validate(value))) {
        highlightInvalidField(field, message);
        isValid = false;
      } else {
        resetField(field);
      }
    });
    return isValid;
  }

  // Verify payment
  async function verifyPayment() {
    const applicationNumber = document.getElementById("applicationNumber").value.trim();
    const verifyButton = document.getElementById("verifyButton");
    const originalText = verifyButton.innerHTML;
    setLoadingState(verifyButton, true, originalText);

    if (!applicationNumber) {
      highlightInvalidField(document.getElementById("applicationNumber"), "Please enter your application number");
      setLoadingState(verifyButton, false, originalText);
      return;
    }

    try {
      const response = await fetch(`/api/payment/verify-application/${applicationNumber}`);
      const result = await response.json();
      const paymentStatus = document.getElementById("paymentStatus");
      if (result.success) {
        paymentStatus.className = "alert alert-success";
        paymentStatus.textContent = "Payment verified! Please complete the application form below.";
        paymentStatus.classList.remove("d-none");
        document.getElementById("applicationForm").classList.remove("d-none");
        document.getElementById("payOption").classList.add("d-none");
        document.getElementById("email").value = result.payment.email;
        document.getElementById("firstName").value = result.payment.name.split(" ")[0] || "";
        document.getElementById("lastName").value = result.payment.name.split(" ").slice(1).join(" ") || "";
        document.getElementById("phone").value = result.payment.phone || "";
      } else {
        paymentStatus.className = "alert alert-warning";
        paymentStatus.textContent = "No payment found for this application number. Please pay the application fee.";
        paymentStatus.classList.remove("d-none");
        document.getElementById("payOption").classList.remove("d-none");
        document.getElementById("applicationForm").classList.add("d-none");
      }
    } catch (error) {
      console.error("Verification error:", error);
      showMessage("Failed to verify payment. Please try again.", "danger");
    } finally {
      setLoadingState(verifyButton, false, originalText);
    }
  }

  // Initialize payment
  function initializePayment() {
    const payButton = document.getElementById("payButton");
    const originalText = payButton.innerHTML;
    setLoadingState(payButton, true, originalText);

    try {
      const handler = PaystackPop.setup({
        key: "pk_live_e6942e61f70c87019cbeb64ffed04e10fbd2ee10", // Live key
        amount: 20000, // ₦200 in kobo
        currency: "NGN",
        ref: `APP_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        callback: async (response) => {
          try {
            const verifyResponse = await fetch("/api/payment/apply", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reference: response.reference,
                email: response.email || "unknown@example.com",
                name: response.metadata?.custom_fields?.find(f => f.variable_name === "full_name")?.value || "Unknown",
                phone: response.metadata?.custom_fields?.find(f => f.variable_name === "phone")?.value || "",
                amount: 20000,
              }),
            });
            const result = await verifyResponse.json();
            if (result.success) {
              sessionStorage.setItem("applicationNumber", result.applicationNumber);
              sessionStorage.setItem("paymentReference", response.reference);
              document.getElementById("applicationNumber").value = result.applicationNumber;
              verifyPayment(); // Re-verify to show form
            } else {
              throw new Error(result.error || "Payment verification failed");
            }
          } catch (error) {
            console.error("Payment verification error:", error);
            showMessage(error.message || "Payment verification failed. Please contact support.", "danger");
          } finally {
            setLoadingState(payButton, false, originalText);
          }
        },
        onClose: () => {
          console.log("Payment window closed");
          showMessage("Payment cancelled", "warning");
          setLoadingState(payButton, false, originalText);
        },
      });
      handler.openIframe();
    } catch (error) {
      console.error("Payment initialization error:", error);
      showMessage("Failed to initialize payment. Please check your connection and try again.", "danger");
      setLoadingState(payButton, false, originalText);
    }
  }

  // Submit application
  async function submitApplication() {
    const form = document.getElementById("applicationForm");
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    setLoadingState(submitButton, true, originalText);

    if (!validateApplicationForm()) {
      showMessage("Please fill in all required fields correctly", "danger");
      setLoadingState(submitButton, false, originalText);
      return;
    }

    try {
      const applicationData = {
        applicationNumber: document.getElementById("applicationNumber").value.trim(),
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        gender: document.getElementById("gender").value,
        dateOfBirth: document.getElementById("dateOfBirth").value,
        address: document.getElementById("address").value.trim(),
        courseId: document.getElementById("courseId").value,
        schedule: document.getElementById("schedule").value,
      };

      const response = await fetch("/api/student/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(applicationData),
      });
      const result = await response.json();
      if (result.success) {
        sessionStorage.setItem("applicationNumber", result.applicationNumber);
        document.getElementById("applicationNumber").textContent = result.applicationNumber;
        const successModal = new bootstrap.Modal(document.getElementById("successModal"));
        successModal.show();
      } else {
        throw new Error(result.error || "Application submission failed");
      }
    } catch (error) {
      console.error("Application error:", error);
      showMessage(error.message || "Application submission failed. Please try again.", "danger");
    } finally {
      setLoadingState(submitButton, false, originalText);
    }
  }

  // Download application form
  window.downloadApplication = function() {
    const applicationNumber = sessionStorage.getItem("applicationNumber");
    if (applicationNumber) {
      window.open(`/api/application/download?appNum=${applicationNumber}`, "_blank");
    } else {
      showMessage("Application information not found", "danger");
    }
  };

  // Initialize
  loadCourses();
  restrictSchedule();
  document.getElementById("verifyButton").addEventListener("click", verifyPayment);
  document.getElementById("payButton").addEventListener("click", initializePayment);
  document.getElementById("applicationForm").addEventListener("submit", (e) => {
    e.preventDefault();
    submitApplication();
  });
});