document.addEventListener('DOMContentLoaded', () => {
    // Calendar data
    let tabs = [
        {
            id: 'tab-1',
            name: 'Schedule 1',
            currentDate: new Date(),
            selectedDate: new Date(),
            courses: []
        }
    ];
    
    let activeTabId = 'tab-1';
    
    // DOM Elements
    const miniMonthYearElement = document.getElementById('mini-month-year');
    const miniCalendarDays = document.getElementById('mini-calendar-days');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const currentMonthYearElement = document.getElementById('current-month-year');
    const scheduleTabs = document.getElementById('schedule-tabs');
    const addTabBtn = document.getElementById('add-tab');
    const calendarsContainer = document.getElementById('calendars-container');
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
    addTabBtn.addEventListener('click', createNewTab);
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
    
    // Tab handling
    scheduleTabs.addEventListener('click', (event) => {
        // Check if we clicked on a tab or its child elements
        const tabElement = event.target.closest('.tab:not(.add-tab)');
        const closeBtn = event.target.closest('.close-tab');
        
        if (closeBtn) {
            // Handle tab closing
            const tabId = tabElement.getAttribute('data-tab-id');
            if (tabs.length > 1) { // Don't allow closing the last tab
                closeTab(tabId);
                event.stopPropagation(); // Prevent the tab from being activated
            }
        } else if (tabElement) {
            // Handle tab activation
            const tabId = tabElement.getAttribute('data-tab-id');
            activateTab(tabId);
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
        updateMiniCalendar();
        renderAllTabs();
    }
    
    function getActiveTab() {
        return tabs.find(tab => tab.id === activeTabId);
    }
    
    function activateTab(tabId) {
        // Deactivate all tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.calendar-tab').forEach(calendar => {
            calendar.classList.remove('active');
        });
        
        // Activate the selected tab
        document.querySelector(`.tab[data-tab-id="${tabId}"]`).classList.add('active');
        const calendarTab = document.getElementById(tabId);
        if (calendarTab) {
            calendarTab.classList.add('active');
        }
        
        activeTabId = tabId;
        updateTabHeader();
    }
    
    function createNewTab() {
        // Create new tab data
        const tabNumber = tabs.length + 1;
        const tabId = `tab-${tabNumber}`;
        const newTab = {
            id: tabId,
            name: `Schedule ${tabNumber}`,
            currentDate: new Date(),
            selectedDate: new Date(),
            courses: []
        };
        
        tabs.push(newTab);
        
        // Create new tab button
        const tabElement = document.createElement('li');
        tabElement.className = 'tab';
        tabElement.setAttribute('data-tab-id', tabId);
        tabElement.innerHTML = `${newTab.name} <span class="close-tab">×</span>`;
        
        // Insert before the "+" button
        scheduleTabs.insertBefore(tabElement, addTabBtn);
        
        // Create new calendar container
        const calendarContainer = document.createElement('div');
        calendarContainer.id = tabId;
        calendarContainer.className = 'calendar-tab';
        calendarContainer.innerHTML = `
            <div class="calendar">
                <div class="weekdays-header" id="week-dates-${tabId}">
                    <!-- Will be filled dynamically by JS -->
                </div>
                <div class="week-view" id="week-view-${tabId}">
                    <!-- Calendar grid will be generated by JS -->
                </div>
            </div>
        `;
        
        calendarsContainer.appendChild(calendarContainer);
        
        // Render and activate the new tab
        renderWeekView(newTab);
        activateTab(tabId);
    }
    
    function closeTab(tabId) {
        // Remove tab from data
        const tabIndex = tabs.findIndex(tab => tab.id === tabId);
        tabs.splice(tabIndex, 1);
        
        // Remove tab button
        document.querySelector(`.tab[data-tab-id="${tabId}"]`).remove();
        
        // Remove tab content
        document.getElementById(tabId).remove();
        
        // Activate the first tab if the active tab was closed
        if (activeTabId === tabId) {
            activateTab(tabs[0].id);
        }
    }

    function updateTabHeader() {
        const activeTab = getActiveTab();
        const options = { year: 'numeric', month: 'long' };
        currentMonthYearElement.textContent = new Intl.DateTimeFormat('en-US', options).format(activeTab.currentDate);
    }

    function renderAllTabs() {
        tabs.forEach(tab => {
            renderWeekView(tab);
        });
        updateTabHeader();
    }

    function renderWeekView(tab = getActiveTab()) {
        const weekDatesHeader = document.getElementById(`week-dates-${tab.id}`);
        const weekView = document.getElementById(`week-view-${tab.id}`);
        
        // Clear previous week view
        weekDatesHeader.innerHTML = '';
        weekView.innerHTML = '';
        
        // Get the start of the week (Sunday)
        const startOfWeek = new Date(tab.currentDate);
        startOfWeek.setDate(tab.currentDate.getDate() - tab.currentDate.getDay());
        
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
        renderCourses(tab);
    }

    function renderCourses(tab = getActiveTab()) {
        // Select the correct tab week view
        const weekView = document.getElementById(`week-view-${tab.id}`);
        
        // Clear existing events
        weekView.querySelectorAll('.event').forEach(event => event.remove());
        
        tab.courses.forEach(course => {
            // For each course, render it on each day it occurs
            course.days.forEach(day => {
                const dayColumn = weekView.querySelector(`.day-column[data-day="${day}"]`);
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
        const activeTab = getActiveTab();
        const options = { year: 'numeric', month: 'long' };
        miniMonthYearElement.textContent = new Intl.DateTimeFormat('en-US', options).format(activeTab.selectedDate);
        
        // Clear previous mini calendar days
        miniCalendarDays.innerHTML = '';
        
        // Get first day of the month
        const firstDay = new Date(activeTab.selectedDate.getFullYear(), activeTab.selectedDate.getMonth(), 1);
        const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Get number of days in month
        const lastDay = new Date(activeTab.selectedDate.getFullYear(), activeTab.selectedDate.getMonth() + 1, 0);
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
                activeTab.selectedDate.getFullYear() === today.getFullYear() &&
                activeTab.selectedDate.getMonth() === today.getMonth() &&
                i === today.getDate()
            ) {
                dayDiv.classList.add('today');
            }
            
            // Add click event to select day
            dayDiv.addEventListener('click', () => {
                activeTab.selectedDate = new Date(activeTab.selectedDate.getFullYear(), activeTab.selectedDate.getMonth(), i);
                updateMiniCalendar();
                
                // Update main calendar to show the selected date's week
                activeTab.currentDate = new Date(activeTab.selectedDate);
                updateTabHeader();
                renderWeekView();
            });
            
            miniCalendarDays.appendChild(dayDiv);
        }
    }

    function navigateWeek(direction) {
        const activeTab = getActiveTab();
        activeTab.currentDate.setDate(activeTab.currentDate.getDate() + direction * 7);
        updateTabHeader();
        renderWeekView();
    }

    function navigateMiniMonth(direction) {
        const activeTab = getActiveTab();
        activeTab.selectedDate.setMonth(activeTab.selectedDate.getMonth() + direction);
        updateMiniCalendar();
    }

    function goToToday() {
        const activeTab = getActiveTab();
        activeTab.currentDate = new Date();
        activeTab.selectedDate = new Date();
        updateTabHeader();
        renderWeekView();
        updateMiniCalendar();
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
        const activeTab = getActiveTab();
        for (const existingCourse of activeTab.courses) {
            // Check if courses share any days
            const sharedDays = existingCourse.days.filter(day => newCourse.days.includes(day));
            
            if (sharedDays.length > 0) {
                // Check if times overlap on shared days
                if (isTimeOverlap(newCourse.startTime, newCourse.endTime, existingCourse.startTime, existingCourse.endTime)) {
                    return existingCourse;
                }
            }
        }
        return null;
    }

    // Check if two time ranges overlap
    function isTimeOverlap(start1, end1, start2, end2) {
        return start1 < end2 && start2 < end1;
    }

    function saveCourse(event) {
        event.preventDefault();
        if (!validateTimes()) return;
        
        // Get form values
        const courseNum = document.getElementById('course-num').value;
        const title = document.getElementById('course-title').value;
        const instructor = document.getElementById('instructor').value;
        const dayCheckboxes = document.querySelectorAll('input[name="days"]:checked');
        const selectedDays = Array.from(dayCheckboxes).map(checkbox => checkbox.value);
        const startTime = document.getElementById('start-time').value;
        const endTime = document.getElementById('end-time').value;
        const color = document.getElementById('color').value;
        
        if (selectedDays.length === 0) {
            showErrorMessage("Please select at least one day");
            return;
        }
        
        // Create new course object
        const newCourse = {
            id: Date.now(), // Simple unique ID
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
        
        // Add new course to active tab
        const activeTab = getActiveTab();
        activeTab.courses.push(newCourse);
        
        // Update calendar
        renderWeekView();
        
        // Close modal
        closeModal();
    }

    // Utility functions
    function formatDate(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }

    function formatTime(timeString) {
        const [hour, minute] = timeString.split(':').map(Number);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    }
});