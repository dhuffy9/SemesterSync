document.addEventListener('DOMContentLoaded', () => {
    // Calendar data
    let currentDate = new Date();
    let selectedDate = new Date();
    let courses = [];
    
    // DOM Elements
    const weekDatesHeader = document.getElementById('week-dates');
    const weekView = document.getElementById('week-view');
    const currentMonthYearElement = document.getElementById('current-month-year');
    const miniMonthYearElement = document.getElementById('mini-month-year');
    const miniCalendarDays = document.getElementById('mini-calendar-days');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const todayBtn = document.getElementById('today-btn');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const viewSelector = document.getElementById('view-selector');
    const courseModal = document.getElementById('course-modal');
    const addCourseBtn = document.getElementById('addCourseBtn');
    const closeModalBtn = document.querySelector('.close');
    const courseForm = document.getElementById('course-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const errorMessageDiv = document.getElementById('error-message');
    
    // Initialize calendar
    initCalendar();
    
    // Event listeners
    prevWeekBtn.addEventListener('click', () => navigateWeek(-1));
    nextWeekBtn.addEventListener('click', () => navigateWeek(1));
    todayBtn.addEventListener('click', goToToday);
    prevMonthBtn.addEventListener('click', () => navigateMiniMonth(-1));
    nextMonthBtn.addEventListener('click', () => navigateMiniMonth(1));
    viewSelector.addEventListener('change', changeView);
    addCourseBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    courseForm.addEventListener('submit', saveCourse);

    document.getElementById('start-time').addEventListener('change', validateTimes);
    document.getElementById('end-time').addEventListener('change', validateTimes);
    
    window.addEventListener('click', (event) => {
        if (event.target == courseModal) {
            closeModal();
        }
    });

    function validateTimes() {
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        
        if (startTime && endTime) {
            if (startTime >= endTime) {
                showErrorMessage("End time must be after start time");
                return false;
            } else {
                hideErrorMessage();
                return true;
            }
        }
        return true;
    }
    
    function showErrorMessage(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.add('show');
    }
    
    function hideErrorMessage() {
        errorMessageDiv.textContent = '';
        errorMessageDiv.classList.remove('show');
    }

    function initCalendar() {
        updateMainCalendarHeader();
        renderWeekView();
        updateMiniCalendar();
    }

    function updateMainCalendarHeader() {
        const options = { year: 'numeric', month: 'long' };
        currentMonthYearElement.textContent = new Intl.DateTimeFormat('en-US', options).format(currentDate);
    }

    function renderWeekView() {
        // Clear previous week view
        weekDatesHeader.innerHTML = '';
        weekView.innerHTML = '';
        
        // Get the start of the week (Sunday)
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        
        // Create weekday headers
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            
            const weekdayDiv = document.createElement('div');
            weekdayDiv.className = 'weekday';
            
            const dayNameDiv = document.createElement('div');
            dayNameDiv.className = 'day-name';
            dayNameDiv.textContent = daysOfWeek[i];
            
            const dayNumberDiv = document.createElement('div');
            dayNumberDiv.className = 'day-number';
            if (date.toDateString() === new Date().toDateString()) {
                dayNumberDiv.classList.add('today');
            }
            dayNumberDiv.textContent = date.getDate();
            
            weekdayDiv.appendChild(dayNameDiv);
            weekdayDiv.appendChild(dayNumberDiv);
            weekDatesHeader.appendChild(weekdayDiv);
            
            // Create day columns for the week view
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            dayColumn.dataset.date = formatDate(date);
            dayColumn.dataset.day = daysOfWeek[i];
            weekView.appendChild(dayColumn);
        }
        
        // Render courses on the calendar
        renderCourses();
    }

    function renderCourses() {
        // Clear existing events
        document.querySelectorAll('.event').forEach(event => event.remove());
        
        courses.forEach(course => {
            // For each course, render it on each day it occurs
            course.days.forEach(day => {
                const dayColumn = document.querySelector(`.day-column[data-day="${day}"]`);
                if (dayColumn) {
                    // Parse time to position the course on the calendar
                    const [startHour, startMinute] = course.startTime.split(':').map(Number);
                    const [endHour, endMinute] = course.endTime.split(':').map(Number);
                    
                    // Calculate position and height (assuming day starts at 8am and ends at 10pm)
                    const dayStart = 8; // 8am
                    const dayHeight = 600; // height of day column in pixels
                    const dayHours = 14; // 14 hours (8am to 10pm)
                    
                    const startPosition = ((startHour - dayStart) + startMinute / 60) * (dayHeight / dayHours);
                    const endPosition = ((endHour - dayStart) + endMinute / 60) * (dayHeight / dayHours);
                    const eventHeight = endPosition - startPosition;
                    
                    // Create event element
                    const eventElement = document.createElement('div');
                    eventElement.className = 'event';
                    eventElement.dataset.courseId = course.id;
                    eventElement.style.top = `${startPosition}px`;
                    eventElement.style.height = `${eventHeight}px`;
                    eventElement.style.backgroundColor = course.color || '#4285F4';
                    
                    const eventTitle = document.createElement('div');
                    eventTitle.className = 'event-title';
                    eventTitle.textContent = `${course.courseNum}: ${course.title}`;
                    
                    const eventDetails = document.createElement('div');
                    eventDetails.className = 'event-details';
                    eventDetails.textContent = `${course.instructor} • ${formatTime(course.startTime)} - ${formatTime(course.endTime)}`;
                    
                    eventElement.appendChild(eventTitle);
                    eventElement.appendChild(eventDetails);
                    dayColumn.appendChild(eventElement);
                }
            });
        });
    }

    function updateMiniCalendar() {
        // Set month and year
        const options = { year: 'numeric', month: 'long' };
        miniMonthYearElement.textContent = new Intl.DateTimeFormat('en-US', options).format(selectedDate);
        
        // Clear previous mini calendar days
        miniCalendarDays.innerHTML = '';
        
        // Get first day of the month
        const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Get number of days in month
        const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        const totalDays = lastDay.getDate();
        
        // Create empty cells for days before first day of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyDay = document.createElement('div');
            miniCalendarDays.appendChild(emptyDay);
        }
        
        // Create cells for days in the month
        const today = new Date();
        for (let i = 1; i <= totalDays; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.textContent = i;
            
            // Check if this day is today
            if (
                selectedDate.getFullYear() === today.getFullYear() &&
                selectedDate.getMonth() === today.getMonth() &&
                i === today.getDate()
            ) {
                dayDiv.classList.add('today');
            }
            
            // Add click event to select day
            dayDiv.addEventListener('click', () => {
                selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
                updateMiniCalendar();
                
                // Update main calendar to show the selected date's week
                currentDate = new Date(selectedDate);
                updateMainCalendarHeader();
                renderWeekView();
            });
            
            miniCalendarDays.appendChild(dayDiv);
        }
    }

    function navigateWeek(direction) {
        currentDate.setDate(currentDate.getDate() + direction * 7);
        updateMainCalendarHeader();
        renderWeekView();
    }

    function navigateMiniMonth(direction) {
        selectedDate.setMonth(selectedDate.getMonth() + direction);
        updateMiniCalendar();
    }

    function goToToday() {
        currentDate = new Date();
        selectedDate = new Date();
        updateMainCalendarHeader();
        renderWeekView();
        updateMiniCalendar();
    }

    function changeView() {
        // In a more complete implementation, this would switch between week and month views
        const view = viewSelector.value;
        if (view === 'month') {
            alert('Month view is not implemented in this demo.');
            viewSelector.value = 'week'; // Default back to week view
        }
    }

    function openModal() {
        hideErrorMessage();
        courseModal.style.display = 'block';
    }

    function closeModal() {
        courseModal.style.display = 'none';
        courseForm.reset();
        hideErrorMessage();
    }

    // Check if course has any conflicts with existing courses
    function hasConflict(newCourse) {
        // For each course day
        for (const day of newCourse.days) {
            // Check against all existing courses on the same day
            const conflictingCourse = courses.find(course => {
                if (course.days.includes(day)) {
                    // Course is on the same day, check time overlap
                    return isTimeOverlap(
                        newCourse.startTime, 
                        newCourse.endTime, 
                        course.startTime, 
                        course.endTime
                    );
                }
                return false;
            });
            
            if (conflictingCourse) {
                return conflictingCourse;
            }
        }
        return null;
    }

    // Check if two time ranges overlap
    function isTimeOverlap(start1, end1, start2, end2) {
        return start1 < end2 && end1 > start2;
    }

    function saveCourse(event) {
        event.preventDefault();
        
        if (!validateTimes()) {
            return;
        }
        
        // Get form values
        const courseNum = document.getElementById('course-num').value;
        const title = document.getElementById('course-title').value;
        const instructor = document.getElementById('instructor').value;
        const dayCheckboxes = document.getElementsByName('days');
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const color = document.getElementById('color').value;
        
        // Get selected days
        const selectedDays = [];
        dayCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selectedDays.push(checkbox.value);
            }
        });
        
        // Validate days selection
        if (selectedDays.length === 0) {
            showErrorMessage("Please select at least one day for the course");
            return;
        }
        
        // Create new course object
        const newCourse = {
            id: generateId(),
            courseNum,
            title,
            instructor,
            days: selectedDays,
            startTime,
            endTime,
            color
        };
        
        // Check for conflicts
        const conflict = hasConflict(newCourse);
        if (conflict) {
            showErrorMessage(`Schedule conflict with ${conflict.courseNum}: ${conflict.title} on ${conflict.days.filter(day => selectedDays.includes(day)).join(', ')}`);
            return;
        }
        
        // Add new course
        courses.push(newCourse);
        
        // Update calendar
        renderWeekView();
        
        // Close modal
        closeModal();
    }

    // Utility functions
    function formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function formatTime(timeString) {
        // Convert 24-hour time format to 12-hour with AM/PM
        const [hours, minutes] = timeString.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        return `${formattedHours}:${String(minutes).padStart(2, '0')} ${period}`;
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
}); 