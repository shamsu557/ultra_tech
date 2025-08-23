// Student Application JavaScript

const selectedCourse = null

// Declare validateForm function
function validateForm(form) {
  const inputs = form.querySelectorAll("input[required], select[required]")
  let isValid = true
  inputs.forEach((input) => {
    if (!input.value.trim()) {
      isValid = false
    }
  })
  return isValid
}

// Declare showMessage function
function showMessage(message, type) {
  const alertContainer = document.getElementById("alertContainer")
  alertContainer.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`
}

// Declare setLoadingState function
function setLoadingState(button, isLoading, originalText) {
  if (isLoading) {
    button.innerHTML = "Loading..."
    button.disabled = true
  } else {
    button.innerHTML = originalText
    button.disabled = false
  }
}

// Declare PaystackPop object
const PaystackPop = {
  setup: (options) => ({
    openIframe: () => {
      console.log("Paystack payment initialized with options:", options)
    },
  }),
}

// Declare generateReference function
function generateReference(prefix) {
  return `${prefix}-${Math.floor(Math.random() * 1000000)}`
}

document.addEventListener("DOMContentLoaded", () => {
  loadCourses()
  setupApplicationForm()
})

// Load courses for selection
async function loadCourses() {
  const courseSelect = document.getElementById("courseId")

  try {
    const response = await fetch("/api/courses")
    const courses = await response.json()

    courseSelect.innerHTML = '<option value="">Select a course</option>'
    courses.forEach((course) => {
      courseSelect.innerHTML += `<option value="${course.id}">${course.name} (${course.duration})</option>`
    })
  } catch (error) {
    console.error("Error loading courses:", error)
    courseSelect.innerHTML = '<option value="">Error loading courses</option>'
  }
}

// Setup application form
function setupApplicationForm() {
  const form = document.getElementById("applicationForm")

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    if (!validateForm(form)) {
      showMessage("Please fill in all required fields", "danger")
      return
    }

    const submitBtn = form.querySelector('button[type="submit"]')
    const originalText = submitBtn.innerHTML
    setLoadingState(submitBtn, true, originalText)

    try {
      // Create application
      const applicationData = {
        firstName: document.getElementById("firstName").value.trim(),
        lastName: document.getElementById("lastName").value.trim(),
        email: document.getElementById("email").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        gender: document.getElementById("gender").value,
        dateOfBirth: document.getElementById("dateOfBirth").value,
        address: document.getElementById("address").value.trim(),
        courseId: document.getElementById("courseId").value,
        schedule: document.getElementById("schedule").value,
      }

      const response = await fetch("/api/student/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(applicationData),
      })

      const result = await response.json()

      if (result.success) {
        // Initialize payment
        initializeApplicationPayment(result.applicationNumber, applicationData.email, result.studentId)
      } else {
        throw new Error(result.error || "Application failed")
      }
    } catch (error) {
      console.error("Application error:", error)
      showMessage(error.message || "Application failed. Please try again.", "danger")
    } finally {
      setLoadingState(submitBtn, false, originalText)
    }
  })
}

// Initialize Paystack payment for application
function initializeApplicationPayment(applicationNumber, email, studentId) {
  const handler = PaystackPop.setup({
    key: "pk_test_your_paystack_public_key", // Replace with actual public key
    email: email,
    amount: 20000, // ₦200 in kobo
    currency: "NGN",
    ref: generateReference("APP"),
    metadata: {
      custom_fields: [
        {
          display_name: "Application Number",
          variable_name: "application_number",
          value: applicationNumber,
        },
        {
          display_name: "Student ID",
          variable_name: "student_id",
          value: studentId,
        },
      ],
    },
    callback: (response) => {
      // Payment successful
      verifyApplicationPayment(response.reference, applicationNumber, studentId)
    },
    onClose: () => {
      showMessage("Payment cancelled", "warning")
    },
  })

  handler.openIframe()
}

// Verify application payment
async function verifyApplicationPayment(reference, applicationNumber, studentId) {
  try {
    const response = await fetch("/api/payment/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reference: reference,
        studentId: studentId,
        paymentType: "Application",
      }),
    })

    const result = await response.json()

    if (result.success) {
      // Show success modal
      document.getElementById("applicationNumber").textContent = applicationNumber
      const successModal = {
        show: () => {
          console.log("Success modal shown for application number:", applicationNumber)
        },
      }
      successModal.show()

      // Store application number for receipt download
      sessionStorage.setItem("applicationNumber", applicationNumber)
      sessionStorage.setItem("paymentReference", reference)
    } else {
      throw new Error(result.error || "Payment verification failed")
    }
  } catch (error) {
    console.error("Payment verification error:", error)
    showMessage("Payment verification failed. Please contact support.", "danger")
  }
}

// Download receipt
function downloadReceipt() {
  const applicationNumber = sessionStorage.getItem("applicationNumber")
  const reference = sessionStorage.getItem("paymentReference")

  if (applicationNumber && reference) {
    window.open(`/api/receipt/download?type=application&ref=${reference}&appNum=${applicationNumber}`, "_blank")
  } else {
    showMessage("Receipt information not found", "danger")
  }
}