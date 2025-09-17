// Instructor Search JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('instructor-search');
    const searchStatus = document.getElementById('search-status');
    const resultsContainer = document.getElementById('instructor-results');
    
    let searchTimeout;
    
    // Add event listener for search input
    searchInput.addEventListener('input', handleSearchInput);
    
    function handleSearchInput() {
        const searchTerm = searchInput.value.trim();
        
        if (searchTerm.length < 2) {
            clearResults();
            return;
        }
        
        // Debounce the search to prevent too many rapid requests
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(async () => {
            await searchInstructors(searchTerm);
        }, 300); // 300ms debounce
    }
    
    async function searchInstructors(searchTerm) {
        try {
            searchStatus.innerHTML = '<div class="loading">Searching...</div>';
            searchStatus.className = 'search-status loading';
            
            const response = await fetch('/api/classes');
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Filter results by instructor name
            const instructorResults = {};
            
            if (Array.isArray(data)) {
                data.forEach(course => {
                    const instructor = course.Instructor || 'TBD';
                    if (instructor.toLowerCase().includes(searchTerm.toLowerCase()) && instructor !== 'TBD') {
                        if (!instructorResults[instructor]) {
                            instructorResults[instructor] = [];
                        }
                        instructorResults[instructor].push(course);
                    }
                });
            }
            
            displayInstructorResults(instructorResults, searchTerm);
            
        } catch (error) {
            console.error('Error searching for instructors:', error);
            searchStatus.innerHTML = '<div class="error">Error searching for instructors. Please try again.</div>';
            searchStatus.className = 'search-status error';
        }
    }
    
    function displayInstructorResults(results, searchTerm) {
        const instructorNames = Object.keys(results);
        
        if (instructorNames.length === 0) {
            searchStatus.innerHTML = `<div class="no-results">No instructors found matching "${searchTerm}"</div>`;
            searchStatus.className = 'search-status no-results';
            resultsContainer.innerHTML = '';
            return;
        }
        
        searchStatus.innerHTML = `<div class="results-count">Found ${instructorNames.length} instructor(s) matching "${searchTerm}"</div>`;
        searchStatus.className = 'search-status success';
        
        resultsContainer.innerHTML = '';
        
        instructorNames.forEach(instructorName => {
            const courses = results[instructorName];
            const instructorDiv = createInstructorCard(instructorName, courses);
            resultsContainer.appendChild(instructorDiv);
        });
    }
    
    function createInstructorCard(instructorName, courses) {
        const instructorDiv = document.createElement('div');
        instructorDiv.className = 'instructor-card';
        
        const instructorHeader = document.createElement('div');
        instructorHeader.className = 'instructor-header';
        instructorHeader.innerHTML = `
            <h3>${instructorName}</h3>
            <div class="course-count">${courses.length} course${courses.length > 1 ? 's' : ''}</div>
        `;
        
        const coursesDiv = document.createElement('div');
        coursesDiv.className = 'instructor-courses';
        
        courses.forEach(course => {
            const courseDiv = document.createElement('div');
            courseDiv.className = 'course-item';
            
            const scheduleInfo = parseSchedule(course.Schedule);
            
            courseDiv.innerHTML = `
                <div class="course-header">
                    <div class="course-number">${course.Course || 'N/A'}</div>
                    <div class="course-title">${course['Course Title'] || 'No title'}</div>
                </div>
                <div class="course-details">
                    <div class="schedule-info">
                        <strong>Schedule:</strong> ${scheduleInfo.readable}
                    </div>
                    <div class="seat-info">
                        <strong>Available Seats:</strong> ${course['Avail Seats:'] || 'N/A'}
                    </div>
                    ${course.Campus ? `<div class="campus-info"><strong>Campus:</strong> ${course.Campus}</div>` : ''}
                </div>
            `;
            
            coursesDiv.appendChild(courseDiv);
        });
        
        instructorDiv.appendChild(instructorHeader);
        instructorDiv.appendChild(coursesDiv);
        
        return instructorDiv;
    }
    
    function parseSchedule(schedule) {
        if (!schedule || schedule === 'Schedule TBD') {
            return {
                readable: 'Schedule TBD',
                days: [],
                time: null
            };
        }
        
        // Match day codes (M, T, W, R, F, S, U) followed by time ranges
        const schedulePattern = /([MTWRFSU]+)\s+(\d+:\d+(?::\d+)?\s*[AP]M)\s*-\s*(\d+:\d+(?::\d+)?\s*[AP]M)/i;
        const match = schedule.match(schedulePattern);
        
        if (match) {
            const dayCode = match[1];
            const startTime = match[2];
            const endTime = match[3];
            
            // Convert day codes to full day names
            const dayMap = {
                'M': 'Monday',
                'T': 'Tuesday', 
                'W': 'Wednesday',
                'R': 'Thursday',
                'F': 'Friday',
                'S': 'Saturday',
                'U': 'Sunday'
            };
            
            const days = [];
            for (let i = 0; i < dayCode.length; i++) {
                const dayName = dayMap[dayCode[i]];
                if (dayName) {
                    days.push(dayName);
                }
            }
            
            const daysText = days.join(', ');
            const readable = `${daysText} from ${startTime} to ${endTime}`;
            
            return {
                readable: readable,
                days: days,
                time: `${startTime} - ${endTime}`
            };
        }
        
        // If pattern doesn't match, return the original schedule
        return {
            readable: schedule,
            days: [],
            time: null
        };
    }
    
    function clearResults() {
        resultsContainer.innerHTML = '';
        searchStatus.innerHTML = '';
        searchStatus.className = 'search-status';
    }
});