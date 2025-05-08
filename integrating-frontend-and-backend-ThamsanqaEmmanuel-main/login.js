function validateForm(event) {
    event.preventDefault();  

   
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    
    const correctEmail = "user@example.com";
    const correctPassword = "password123";

   
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

   
    if (!email || !emailPattern.test(email)) {
        alert('Please enter a valid email address');
        document.getElementById('emailError').innerText = 'Invalid email address';
        return;
    } else {
        document.getElementById('emailError').innerText = '';
    }

    if (!password) {
        alert('Please enter your password');
        return;
    }

    if (email === correctEmail && password === correctPassword) {
        alert('Login successful! Redirecting to profile page...');
        window.location.href = 'profile.html';  
    } else {
        alert('Invalid email or password. Please try again.');
    }
}
