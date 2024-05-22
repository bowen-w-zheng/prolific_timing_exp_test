document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('experimentCanvas');
    const ctx = canvas.getContext('2d');

    const instructions = document.getElementById('instructions');
    const startButton = document.getElementById('startButton');
    const startFormalButton = document.getElementById('startFormalButton'); // New button

    // Set canvas size to fill the window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Update constants for positioning and sizes based on new canvas size
    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2;
    const fixationSize = 10;  // Size for the fixation point
    const annularSize = 50;  // Size for the annular
    const timeWindow = 300;  // Acceptable timing window
    const flashTime = 800; // Onset time for the flash
    const fixRatio = 1.44444; // Ratio of fixation correct time to the flash Onset time
    const correctTime = flashTime * fixRatio;  // Ideal timing for pressing the space bar
    const maxResponseTime = correctTime + 4 * timeWindow;  // Max wait time without response
    const iti = 1000;  // Inter-trial interval
    const max_reward = 100;

    const maxPracticeTrialsCount = 200;
    const formalTrialsCount = 500;

    let trialCount = 0;
    let isPractice = true;

    let lastAnnularTime = 0;
    let timeoutHandle = null;  // Handle for timing out the response check
    let flashHandle = null; // Handle for the flash timing
    let state = 'init';  // Track the state of the experiment

    let trialData = []; // Array to store trial data

    // Ensure the example canvases are drawn correctly
    const exampleCanvas1 = document.getElementById('exampleCanvas1');
    const exampleCtx1 = exampleCanvas1.getContext('2d');
    const exampleCanvas2 = document.getElementById('exampleCanvas2');
    const exampleCtx2 = exampleCanvas2.getContext('2d');
    const exampleCanvas3 = document.getElementById('exampleCanvas3');
    const exampleCtx3 = exampleCanvas3.getContext('2d');

    const practiceTrialsCount = 50;

    function drawFixationExample(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawAnnularExample(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, 40, 0, Math.PI * 2);
        ctx.stroke();
    }
    function drawFlashExample(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(ctx.canvas.width / 2, ctx.canvas.height / 2, 40, 0, Math.PI * 2);
        ctx.fill();
    }
    // Draw examples
    drawFixationExample(exampleCtx1);
    drawAnnularExample(exampleCtx2);
    drawFlashExample(exampleCtx3);

    function drawFixation() {
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centerX, centerY, fixationSize, 0, Math.PI * 2);
        ctx.fill();
    }

    function clearCanvas(excludeFixation = false) {
        if (excludeFixation) {
            // Clear the whole canvas except the center area where the fixation point is
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.clearRect(centerX - fixationSize - 1, centerY - fixationSize - 1, fixationSize * 2 + 2, fixationSize * 2 + 2);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    

    function drawAnnular() {
        clearCanvas(true); // Clear canvas but exclude the fixation point
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, annularSize, 0, Math.PI * 2);
        ctx.stroke();
        lastAnnularTime = Date.now();  // Record the time the annular is shown
        state = 'waiting_for_response';
    
        // Clear the annular after 100ms
        setTimeout(() => {
            clearCanvas(true);
            drawFixation();
        }, 100);
        
        // Decide randomly whether to have a flash this trial
        if (Math.random() < 0.5) {
            flashHandle = setTimeout(drawFlash, flashTime); // Schedule a flash at 800ms
        }
    
        // Set a timeout to automatically fail the trial if no response after the specified time
        timeoutHandle = setTimeout(() => {
            state = 'closed_response'; // close the response state 
            giveFeedback(false); // Automatically fail the trial
        }, maxResponseTime);
    }
    

    function drawFlash() {
        clearCanvas(true); // Clear canvas but exclude the fixation point
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(centerX, centerY, annularSize, 0, Math.PI * 2);
        ctx.fill();
        setTimeout(() => {
            clearCanvas(true);
            drawFixation();
        }, 100); // Flash appears briefly for 100ms
    }
    

    function drawErrorBar(error) {
        const barMaxWidth = canvas.width / 2; // Maximum width for the error bar from center to edge
        const errorScale = barMaxWidth / 2000; // Scaling factor (canvas width represents 2000ms)
        const barWidth = Math.min(Math.abs(error * errorScale), barMaxWidth); // Calculate width of the bar based on error
        const barHeight = 20; // Height of the error bar
        const barY = centerY + 100; // Position below the feedback circle

        ctx.fillStyle = 'white';
        ctx.beginPath();
        if (error > 0) {
            ctx.rect(centerX, barY, barWidth, barHeight); // Draw bar extending to the right for positive errors
        } else {
            ctx.rect(centerX - barWidth, barY, barWidth, barHeight); // Draw bar extending to the left for negative errors
        }
        ctx.fill();
    }

    function giveFeedback(isCorrect, responseTime) {
        const error = responseTime - correctTime; // Calculate the error
        const error_abs = Math.abs(responseTime - correctTime); // Absolute value of error
        const reward = Math.max(0, max_reward - (max_reward / timeWindow) * error_abs); // Calculate reward
    
        // Log the trial data
        trialData.push({
            trialNumber: trialCount,
            isPractice: isPractice,
            responseTime: responseTime,
            isCorrect: isCorrect,
            error: error,
            reward: reward
        });

        clearTimeout(timeoutHandle); // Clear the fail timeout
        clearTimeout(flashHandle); // Ensure no pending flash interrupts the feedback
        clearCanvas(); // Clear canvas without excluding the fixation point
        ctx.fillStyle = isCorrect ? 'green' : 'red';
        ctx.beginPath();
        ctx.arc(centerX, centerY, annularSize, 0, Math.PI * 2);
        ctx.fill();
    
        // Draw the error bar only in practice trials
        if (isPractice) {
            drawErrorBar(error);
        }
    
        // Display the reward value
        ctx.fillStyle = 'white';
        ctx.font = "20px Arial";
        ctx.fillText("Reward: " + reward.toFixed(2), centerX - 50, centerY + 50);
    
        setTimeout(() => {
            trialCount++;
            if (isPractice && trialCount >= practiceTrialsCount) {
                isPractice = false;
                trialCount = 0;
                alert('Practice completed. Starting formal trials.');
            } else if (!isPractice && trialCount >= formalTrialsCount) {
                endExperiment(); // End the experiment
                return; // Stop the experiment
            }
            clearCanvas();
            setTimeout(startTrial, iti);  // Wait for ITI before starting next trial
        }, 2000);  // Extended duration to display feedback and error bar
    }
    
    function startTrial() {
        clearCanvas(); // Clear the canvas before starting a new trial
        state = 'init'; // Set the state to init
        drawFixation();  // Draw fixation point to start
        // Sample a time to decide when to show the annular, exponential decaying with mean at 1000ms
        const time_before_ready = -Math.log(1 - Math.random()) * 1000 + 200;
        setTimeout(drawAnnular, time_before_ready);  // Delay before showing annular
    }

    function endExperiment() {
        // Convert trial data to JSON
        let dataToSend = JSON.stringify(trialData);

        // Send the data to your server (you need to implement server-side handling)
        fetch('https://yourserver.com/save-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: dataToSend
        })
        .then(response => response.json())
        .then(data => {
            console.log('Data saved successfully:', data);
            // Redirect to Prolific completion URL
            window.location.href = "https://app.prolific.co/submissions/complete?cc=YOUR_COMPLETION_CODE";
        })
        .catch(error => {
            console.error('Error saving data:', error);
        });
    }

    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space' && state === 'waiting_for_response') {
            state = 'closed_response'; // Close response state
            const responseTime = Date.now() - lastAnnularTime;
            const isCorrect = responseTime >= (correctTime - timeWindow) && responseTime <= (correctTime + timeWindow);
            giveFeedback(isCorrect, responseTime);
        }
    });

    startButton.addEventListener('click', function() {
        instructions.style.display = 'none'; // Hide instructions
        startTrial();  // Start the first trial
    });

    window.addEventListener('resize', function() {
        // Update canvas size and center positions on window resize
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        centerX = canvas.width / 2;
        centerY = canvas.height / 2;

        clearCanvas(); // Clears the canvas first
        drawFixation(); // You might need to modify this if you need to restore specific states

        // If specific elements need to be redrawn based on state, check those conditions here
        if (state === 'waiting_for_response' || state === 'iti') {
            drawFixation();
        }
        // Add any other conditions to redraw elements depending on the current state
    });
});
