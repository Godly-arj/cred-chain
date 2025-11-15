document.addEventListener('DOMContentLoaded', () => {
    // Select all the elements we need
    const roleRadios = document.querySelectorAll('input[name="role"]');
    const employerForm = document.getElementById('employerForm');
    
    // Updated selectors for the new freelancer structure
    const freelancerSection = document.getElementById('freelancerSection'); // The new wrapper
    const freelancerForm = document.getElementById('freelancerForm');     // The div with just the form fields
    
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const loginForm = document.getElementById('loginForm');

    // New selectors for GitHub Verification
    const verify= document.getElementById('verify');
    const profileLinkInput = document.getElementById('profileLink');

    /**
     * Get all required input fields for a given form section.
     */
    function getRequiredInputs(formSection) {
        return formSection.querySelectorAll('input[required], select[required], textarea[required]');
    }

    /**
     * Check if all required fields are filled for the active form.
     */
    function checkFormValidity() {
        let currentFormInputs;
        
        // Check which form is active by seeing which one is NOT hidden
        if (!employerForm.classList.contains('hidden')) {
            // Employer form is active
            currentFormInputs = getRequiredInputs(employerForm);
        } else {
            // Freelancer form is active
            currentFormInputs = getRequiredInputs(freelancerForm);
        }

        let allFieldsFilled = true;
        currentFormInputs.forEach(input => {
            if (input.value.trim() === '' || (input.type === 'email' && !input.checkValidity())) {
                allFieldsFilled = false;
            }
        });
        
        // Enable/disable the Connect Wallet button
        connectWalletBtn.disabled = !allFieldsFilled;
    }

    /**
     * Event listener for role selection.
     */
    roleRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
        const employerInputs = employerForm.querySelectorAll('input[required], select[required]');
        const freelancerInputs = freelancerForm.querySelectorAll('input[required], select[required]');

        if (event.target.value === 'employer') {
                    employerForm.classList.remove('hidden');
                    freelancerSection.classList.add('hidden');

                    // Make employer fields required, and freelancer fields not required
                    employerInputs.forEach(input => input.required = true);
                    freelancerInputs.forEach(input => input.required = false);

                } else {
                    freelancerSection.classList.remove('hidden');
                    employerForm.classList.add('hidden');

                    // Make freelancer fields required, and employer fields not required
                    employerInputs.forEach(input => input.required = false);
                    freelancerInputs.forEach(input => input.required = true);
                }
                // Re-check validity when form switches
                checkFormValidity();
            });
        });

// Also, run this logic once on page load to set the initial state
document.querySelector('input[name="role"]:checked').dispatchEvent(new Event('change'));

    // Add event listeners to all input fields for real-time validation
    loginForm.addEventListener('input', checkFormValidity);

    // Initial check on page load (for the default selected role)
    checkFormValidity();

    /**
     * Event listener for Connect Wallet button.
     */
    // AFTER
// --- Global variable to store the connected account ---
let account;

/**
 * Event listener for Connect Wallet button.
 */
connectWalletBtn.addEventListener('click', async () => {
    if (!window.connectWallet) {
        alert("Error: credchain.js module not loaded");
        return;
    }

    try {
        // Call the function from credchain.js
        const addr = await window.connectWallet();
        account = addr; // Save the account for later
        
        console.log("Wallet connected:", account);
        
        // Update the UI
        connectWalletBtn.textContent = "Wallet Connected!";
        connectWalletBtn.style.backgroundColor = '#059669'; // Green color
        
        // You could also display the address
        // document.getElementById('walletAddressDisplay').innerText = "Connected: " + account;

    } catch (e) {
        console.error("connect error:", e);
        alert("Connection failed: " + e.message);
        connectWalletBtn.textContent = "Connection Failed";
        connectWalletBtn.style.backgroundColor = '#DC2626'; // Red color
    }
});


// ... inside the document.addEventListener('DOMContentLoaded', () => { ... })

    /**
     * Event listener for the GitHub Verify button.
     */
    if (verify) {
        verify.addEventListener('click', async () => {
            if (!account) {
                alert("Please connect your wallet first.");
                return;
            }
            if (!window.verifyUserOnChain) {
                alert("Error: verifyUserOnChain function not loaded.");
                return;
            }

            const link = profileLinkInput.value;
            
            // 1. Call backend to validate the link
            const backendRes = await fetch("http://localhost:5000/verifyuser", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({wallet: account,  profile_link: link})
            });

            const backendData = await backendRes.json();

            if (!backendData.valid) {
                alert("GitHub validation failed: " + backendData.reason);
                return;
            }

            // 2. If backend is happy, call the smart contract
            alert("Backend verification successful! Please confirm the transaction on-chain.");
            
            try {
                const { wallet, tx } = await window.verifyUserOnChain();
                console.log("Verified wallet:", wallet);
                alert("Verified On Chain!\nWallet: " + wallet + "\nTx: " + tx.transactionHash);
                
                // Update UI
                verify.textContent = "Verified!";
                verify.disabled = true;

            } catch (err) {
                console.error("On-chain verification error:", err);
                alert("On-chain verification failed: " + err.message);
            }
        });
    } else {
        console.log("Verify button not found on this page.");
    }

// ... rest of your login.js

    /**
     * Event listener for the final Login button (form submission).
     */
// AFTER
/**
 * Event listener for the final Login button (form submission).
 */
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Stop the form from reloading the page

    // 1. Check if wallet is connected
    // (The 'account' variable is set by your connectWalletBtn listener)
    if (!account) { 
        alert('Please connect your wallet first!');
        return;
    }

    // 2. Get all form data
    const formData = new FormData(loginForm);
    const data = Object.fromEntries(formData.entries());
    data.wallet = account; // Add the connected wallet address

    // 3. Find out which role is selected
    const selectedRole = document.querySelector('input[name="role"]:checked').value;

    // 4. Handle logic based on role
    if (selectedRole === 'freelancer') {
        
        // --- FREELANCER LOGIN ---
        // We will call your /create_profile endpoint from app.py
        try {
            const profileData = {
                wallet: data.wallet,
                name: data.freelancerName,
                linkedin: data.freelancerLinkedIn,
                skills: data.skills.split(',').map(s => s.trim()), // Convert string to array
                email: data.emailAddress,
                phone: data.phoneNumber
                // Note: Your form doesn't have 'bio' or 'github',
                // but your app.py endpoint handles that.
            };

            const response = await fetch('http://localhost:5000/create_profile', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(profileData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Profile saved successfully! Redirecting to your dashboard.');
                // Redirect to the Freelancer dashboard
                window.location.href = '/Fdashboard'; 
            } else {
                alert('Error saving profile: ' + (result.error || 'Unknown error'));
            }

        } catch (err) {
            console.error('Freelancer login error:', err);
            alert('A frontend error occurred. Check the console.');
        }

    } else if (selectedRole === 'employer') {
        
        // --- EMPLOYER LOGIN ---
        // You do not have a backend endpoint for this yet in app.py.
        // For now, we can just redirect them.
        
        // In the future, you would add:
        // await fetch('http://localhost:5000/save_employer_profile', { ... });
        
        alert('Employer login successful! Redirecting to your dashboard.');
        // Redirect to the Employer dashboard
        window.location.href = '/Edashboard';
    }
});
    
    

});