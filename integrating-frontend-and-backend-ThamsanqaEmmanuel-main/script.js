
        // Function to calculate age based on the given Date of Birth
        function calculateAge(dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDifference = today.getMonth() - birthDate.getMonth();
            if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        }

// Validate form on submit
document.getElementById('registration-form').addEventListener('submit', function (event) {
    event.preventDefault(); // Prevent default form submission

    let isValid = true;

    // Get form field values
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const dob = document.getElementById('dob').value;
    const gender = document.querySelector('input[name="gender"]:checked');
    const address = document.getElementById('address').value.trim();

    // Clear previous error messages
    document.querySelectorAll('.error').forEach(span => span.innerText = '');

    // Validation checks
    if (!firstName) {
        document.getElementById('firstNameError').innerText = 'First name is required';
        isValid = false;
    }

    if (!lastName) {
        document.getElementById('lastNameError').innerText = 'Last name is required';
        isValid = false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('emailError').innerText = 'Valid email is required';
        isValid = false;
    }

    if (!password) {
        document.getElementById('passwordError').innerText = 'Password is required';
        isValid = false;
    } else if (password.length < 6) {
        document.getElementById('passwordError').innerText = 'Password must be at least 6 characters';
        isValid = false;
    }

    if (!confirmPassword) {
        document.getElementById('confirmPasswordError').innerText = 'Please confirm your password';
        isValid = false;
    } else if (password !== confirmPassword) {
        document.getElementById('confirmPasswordError').innerText = 'Passwords do not match';
        isValid = false;
    }

    if (!phone || !/^\d{10}$/.test(phone)) {
        document.getElementById('phoneError').innerText = 'Phone number must be 10 digits';
        isValid = false;
    }
      
  
     if (!dob) {
        document.getElementById('dobError').innerText = 'Date of birth is required';
        isValid = false;
    } else {
        const age = calculateAge(dob);
        if (age < 18) {
            document.getElementById('dobError').innerText = 'You must be at least 18 years old to register.';
            isValid = false;
        }
    }
    if (!gender) {
        document.getElementById('genderError').innerText = 'Gender selection is required';
        isValid = false;
    }

    if (!address) {
        document.getElementById('addressError').innerText = 'Address is required';
        isValid = false;
    }

    // If the form is valid, proceed with submission
    if (isValid) {
        alert('Form is valid');
        this.submit(); // Submit the form
    }
});
