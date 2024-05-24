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
    const rewardWindowRatio = 0.3 // proportional to the timing interval
    const flashTime = 800; // Onset time for the flash
    const fixRatio = 1.44444; // Ratio of fixation correct time to the flash Onset time
    const correctTime = flashTime * fixRatio;  // Ideal timing for pressing the space bar
    const timeWindow = correctTime * rewardWindowRatio;  // Acceptable timing window
    const maxResponseTime = correctTime + 4 * timeWindow;  // Max wait time without response
    const itiMean = 500
    const itiMin = 300
    const itiMax = 1000
    const setTimeDurMean = 300
    const setTimeDurMin = 300
    const setTimeDurMax = 1500
    const max_reward = 100;
    const flashjitterMin = -75
    const flashjitterMax = 75
    


    const maxPracticeTrialsCount = 200;
    const practiceTrialsCount = 50;
    const formalTrialsCount = 200;
    let flashOn = 0;
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



    function randomExponential(beta) {
        // Generate a uniform random number in the range (0, 1)
        const u = Math.random();
        // Apply the inverse transform method for exponential distribution
        return -beta * Math.log(1 - u);
    }
    
    function boundedExponential(beta, min, max) {
        let value;
        do {
            // Generate a random number from the exponential distribution with mean `beta`
            value = randomExponential(beta);
            // Adjust the value to start from `min`
            value += min;
        } while (value > max);
        return value;
    }

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
        
        // Decide randomly whether flashOn or off
        flashOn = Math.random() < 0.5;
        flashjitter = flashjitterMin + (flashjitterMax - flashjitterMin) * Math.random() // random small jitter with mean at 
        trueflashTime = flashTime + flashjitter
        if (flashOn) {
            flashHandle = setTimeout(drawFlash, trueflashTime); // Schedule a flash at 800ms
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
        iti = boundedExponential(itiMean, itiMin, itiMax)
        const error = responseTime - correctTime; // Calculate the error
        const error_abs = Math.abs(responseTime - correctTime); // Absolute value of error
        const reward = Math.max(0, max_reward - (max_reward / timeWindow) * error_abs); // Calculate reward
    
        // Log the trial data
        trialData.push({
            trialNumber: trialCount,
            iti: iti,
            setTimeDur: setTimeDur,
            isPractice: isPractice,
            responseTime: responseTime,
            isCorrect: isCorrect,
            flashOn: flashOn,
            flashTime: flashTime,
            trueflashTime: trueflashTime,
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
        setTimeDur = boundedExponential(setTimeDurMean, setTimeDurMin, setTimeDurMax)
        setTimeout(drawAnnular, setTimeDur );  // Delay before showing annular
    }

    function endExperiment() {
        // Convert trial data to JSON
        let dataToSend = JSON.stringify(trialData);
    
        // Create a Blob from the JSON string and create a link to download it
        const blob = new Blob([dataToSend], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'experiment_data.json';
        a.click();
    
        // Provide instructions to upload the file
        alert("Please upload the downloaded file to the Google Form to complete the study. You will be redirected to Prolific to finish.");
    
        // Open Google Form in a new tab
        const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeF4b3Hy1ov1NfiySurlQiQY6qeWqgYp1idL4_RdzF1Jes-Nw/viewform?usp=sf_link";
        const newWindow = window.open(googleFormUrl, "_blank");
        if (newWindow) {
            newWindow.focus();
        } else {
            alert("Popup blocked! Please allow popups for this website. You might see the option around the brower link entry location. If not, copy paste this link manually: https://docs.google.com/forms/d/e/1FAIpQLSeF4b3Hy1ov1NfiySurlQiQY6qeWqgYp1idL4_RdzF1Jes-Nw/viewform?usp=sf_link");
        }
    
        // Redirect to Prolific completion URL after a delay
        setTimeout(function() {
            window.location.href = "https://app.prolific.com/submissions/complete?cc=CHQS67SD";
        }, 5000); // Adjust the delay as needed to ensure the form is submitted
    }
    
    

    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space' && state === 'waiting_for_response') {
            state = 'closed_response'; // Close response state
            const responseTime = Date.now() - lastAnnularTime;
            const isCorrect = responseTime >= (correctTime - timeWindow) && responseTime <= (correctTime + timeWindow);
            giveFeedback(isCorrect, responseTime, flashOn);
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
