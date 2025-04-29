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
    const classList = document.getElementById("class-list");
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
    setupClassListItemListeners();
    
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
    
    // Search functionality
    const searchInput = document.getElementById('class-search');
    const searchResults = document.getElementById('search-results');
    
    // Real-time search as user types
    searchInput.addEventListener('input', handleSearchInput);
    
    // Also keep Enter key functionality
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearchInput();
        }
    });
    
    // Clear search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchResults.contains(e.target) && e.target !== searchInput) {
            searchResults.innerHTML = '';
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

    function setupClassListItemListeners() {
        // Get all class items and add click listeners
        document.querySelectorAll('.class-item').forEach(courseDiv => {
            courseDiv.addEventListener('click', () => {
                const activeTab = getActiveTab();
                const course = activeTab.courses.find(c => c.id === parseInt(courseDiv.dataset.courseId));
                if (course) {
                    openEditModal(course);
                }
            });
        });
    }

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
        const tabNumber = parseInt(tabs[tabs.length -1].name.split(" ")[1]) + 1;
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
                <div class="week-view-wrapper">
                    <div class="time-indicators" id="time-indicators-${tabId}">
                        <!-- Time indicators will be added here -->
                    </div>
                    <div class="week-view" id="week-view-${tabId}">
                        <!-- Calendar grid will be generated by JS -->
                    </div>
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
        const timeIndicators = document.getElementById(`time-indicators-${tab.id}`) || createTimeIndicatorsContainer(tab);
        
        // Clear previous week view
        weekDatesHeader.innerHTML = '';
        weekView.innerHTML = '';
        timeIndicators.innerHTML = '';
        
        // Add time indicators (from 8am to 10pm)
        const dayStart = 8; // 8am
        const dayEnd = 22;  // 10pm
        const dayHeight = 600; // height in pixels
        const hourHeight = dayHeight / (dayEnd - dayStart);
        
        for (let hour = dayStart; hour < dayEnd; hour++) {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'time-indicator';
            timeDiv.style.height = `${hourHeight}px`;
            timeDiv.textContent = formatTime(`${hour}:00`);
            timeIndicators.appendChild(timeDiv);
        }
        
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
            
            // Create day columns for the week view with hour grid lines
            const dayColumn = document.createElement('div');
            dayColumn.className = 'day-column';
            dayColumn.dataset.date = formatDate(date);
            dayColumn.dataset.day = daysOfWeek[i];
            
            // Add hour grid lines
            for (let hour = dayStart; hour < dayEnd; hour++) {
                const hourLine = document.createElement('div');
                hourLine.className = 'hour-line';
                hourLine.style.top = `${(hour - dayStart) * hourHeight}px`;
                dayColumn.appendChild(hourLine);
            }
            
            weekView.appendChild(dayColumn);
        }
        
        // Render courses on the calendar
        renderCourses(tab);
    }
    
    function createTimeIndicatorsContainer(tab) {
        // Create container if it doesn't exist (for existing tabs created before this feature)
        const calendarTab = document.getElementById(tab.id);
        const weekView = document.getElementById(`week-view-${tab.id}`);
        
        if (!calendarTab || !weekView) return null;
        
        // Check if parent wrapper exists, if not create it
        let weekViewWrapper = weekView.parentElement;
        if (!weekViewWrapper.classList.contains('week-view-wrapper')) {
            // Create wrapper and insert it in place of weekView
            weekViewWrapper = document.createElement('div');
            weekViewWrapper.className = 'week-view-wrapper';
            weekView.parentNode.insertBefore(weekViewWrapper, weekView);
            weekViewWrapper.appendChild(weekView);
        }
        
        // Create time indicators container
        const timeIndicators = document.createElement('div');
        timeIndicators.id = `time-indicators-${tab.id}`;
        timeIndicators.className = 'time-indicators';
        weekViewWrapper.insertBefore(timeIndicators, weekView);
        
        return timeIndicators;
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
                    
                    // Add edit button
                    const editButton = document.createElement('button');
                    editButton.className = 'edit-course-btn';
                    editButton.innerHTML = '<span class="edit-icon">✎</span>';
                    editButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openEditModal(course);
                    });
                    
                    eventElement.appendChild(eventTitle);
                    eventElement.appendChild(eventDetails);
                    eventElement.appendChild(editButton);
                    dayColumn.appendChild(eventElement);
                }
            });
        });
    }

    // Function to open the edit modal for a course
    function openEditModal(course) {
        // Set form values to the course values
        document.getElementById('course-num').value = course.courseNum;
        document.getElementById('course-title').value = course.title;
        document.getElementById('instructor').value = course.instructor;
        document.getElementById('start-time').value = course.startTime;
        document.getElementById('end-time').value = course.endTime;
        document.getElementById('color').value = course.color;
        
        // Set days checkboxes
        document.querySelectorAll('input[name="days"]').forEach(checkbox => {
            checkbox.checked = course.days.includes(checkbox.value);
        });
        
        // Change form behavior to update instead of create
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.textContent = 'Update Course';
        
        // Store the course ID for updating
        courseForm.dataset.editingCourseId = course.id;
        
        // Add delete button
        let deleteBtn = document.getElementById('delete-btn');
        if (!deleteBtn) {
            deleteBtn = document.createElement('button');
            deleteBtn.id = 'delete-btn';
            deleteBtn.type = 'button';
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = 'Delete Course';
            submitBtn.insertAdjacentElement('afterend', deleteBtn);
            
            deleteBtn.addEventListener('click', function() {
                const courseId = parseInt(courseForm.dataset.editingCourseId);
                deleteCourse(courseId);
                closeModal();
            });
        }
        deleteBtn.style.display = 'inline-block';
        
        // Open the modal
        openModal();
    }
    
    function deleteCourse(courseId) {
        // Remove the course from the active tab
        const activeTab = getActiveTab();
        const courseIndex = activeTab.courses.findIndex(course => course.id === courseId);
        
        if (courseIndex !== -1) {
            // Remove the course from the array
            activeTab.courses.splice(courseIndex, 1);
            
            // Remove the course from the class list
            const courseElement = document.querySelector(`.class-item[data-course-id="${courseId}"]`);
            if (courseElement) {
                courseElement.remove();
            }
            
            // Update the calendar
            renderWeekView();
        }
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
        courseModal.style.display = 'flex';
    }

    function closeModal() {
        courseModal.style.display = 'none';
        courseForm.reset();
        hideErrorMessage();
        
        // Reset form to create mode
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.textContent = 'Add Course';
        courseForm.removeAttribute('data-editing-course-id');
        
        // Hide delete button
        const deleteBtn = document.getElementById('delete-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    }

    // Check if course has any conflicts with existing courses
    function hasConflict(newCourse, excludeCourseId = null) {
        const activeTab = getActiveTab();
        for (const existingCourse of activeTab.courses) {
            // Skip comparing with self when editing
            if (excludeCourseId && existingCourse.id === excludeCourseId) {
                continue;
            }
            
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
            id: courseForm.dataset.editingCourseId ? parseInt(courseForm.dataset.editingCourseId) : Date.now(),
            courseNum,
            title,
            instructor,
            days: selectedDays,
            startTime,
            endTime,
            color
        };
        
        const activeTab = getActiveTab();
        const isEditing = courseForm.dataset.editingCourseId;
        
        // Check for conflicts (exclude self when editing)
        const conflict = hasConflict(newCourse, isEditing ? newCourse.id : null);
        if (conflict) {
            showErrorMessage(`Schedule conflict with ${conflict.courseNum}: ${conflict.title} on ${conflict.days.filter(day => selectedDays.includes(day)).join(', ')}`);
            return;
        }
        
        if (isEditing) {
            // Update existing course
            const courseIndex = activeTab.courses.findIndex(course => course.id === newCourse.id);
            if (courseIndex !== -1) {
                activeTab.courses[courseIndex] = newCourse;
                
                // Update class list item if it exists
                const courseElement = document.querySelector(`.class-item[data-course-id="${newCourse.id}"]`);
                if (courseElement) {
                    const colorDot = courseElement.querySelector('.color-dot');
                    const titleSpan = courseElement.querySelector('span');
                    if (colorDot) colorDot.style.backgroundColor = color;
                    if (titleSpan) titleSpan.textContent = title;
                }
            }
        } else {
            // Add new course to active tab
            activeTab.courses.push(newCourse);
            
            // Create new course div in class list
            const courseDiv = document.createElement("div");
            courseDiv.className = 'class-item';
            courseDiv.dataset.courseId = newCourse.id;
            courseDiv.addEventListener('click', () => {
                const course = activeTab.courses.find(c => c.id === parseInt(courseDiv.dataset.courseId));
                if (course) {
                    openEditModal(course);
                }
            });
            
            const courseDotDiv = document.createElement("div");
            courseDotDiv.className = 'color-dot';
            courseDotDiv.style.backgroundColor = color;
            
            const courseNameSpan = document.createElement("span");
            courseNameSpan.textContent = title;
            
            courseDiv.append(courseDotDiv, courseNameSpan);
            classList.appendChild(courseDiv);
        }
        
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

    // New functions for class search
    async function getData(type) {
        const url = type;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }

    async function searchClasses(searchTerm) {
        try {
            // Pass search term directly to the endpoint like your original getData function
            const response = await fetch(`/api/classes`);
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Filter results on the client side based on search term
            if (Array.isArray(data)) {
                return data.filter(course => {
                    return (
                        (course.Course && course.Course.toLowerCase().includes(searchTerm.toLowerCase())) || 
                        (course['Course Title'] && course['Course Title'].toLowerCase().includes(searchTerm.toLowerCase()))
                    );
                });
            } else if (typeof data === 'object' && data !== null) {
                // If single object was returned
                const matches = 
                    (data.Course && data.Course.toLowerCase().includes(searchTerm.toLowerCase())) || 
                    (data['Course Title'] && data['Course Title'].toLowerCase().includes(searchTerm.toLowerCase()));
                
                return matches ? [data] : [];
            }
            
            return [];
        } catch (error) {
            console.error('Error searching for classes:', error.message);
            return [];
        }
    }

    function handleSearchInput() {
        const searchTerm = document.getElementById('class-search').value.trim();
        const searchResults = document.getElementById('search-results');
        
        if (searchTerm.length < 2) {
            searchResults.innerHTML = '';
            return;
        }
        
        // Debounce the search to prevent too many rapid requests
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(async () => {
            searchResults.innerHTML = '<div class="loading">Searching...</div>';
            const results = await searchClasses(searchTerm);
            displaySearchResults(results, searchResults);
        }, 300); // 300ms debounce
    }

    function displaySearchResults(results, container) {
        container.innerHTML = '';
        
        if (!results || results.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No classes found';
            container.appendChild(noResults);
            return;
        }
        
        results.forEach(classData => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <div class="result-course">${classData.Course}: ${classData['Course Title']}</div>
                <div class="result-details">
                    <span>${classData.Instructor || 'TBD'}</span>
                    <span>${classData.Schedule || 'Schedule TBD'}</span>
                    <span>${classData['Avail Seats:'] || ''}</span>
                </div>
            `;
            
            resultItem.addEventListener('click', () => {
                populateFormWithClass(classData);
                container.innerHTML = ''; // Clear results after selection
            });
            
            container.appendChild(resultItem);
        });
    }

    function populateFormWithClass(classData) {
        // Populate the form fields with the class data
        document.getElementById('course-num').value = classData.Course || '';
        document.getElementById('course-title').value = classData['Course Title'] || '';
        document.getElementById('instructor').value = classData.Instructor || '';

        // Parse and set schedule (days and times)
        if (classData.Schedule) {
            // Match day codes (M, T, W, R, F, S) followed by time ranges
            const schedulePattern = /([MTWRFSU]+)\s+(\d+:\d+(?::\d+)?\s*[AP]M)\s*-\s*(\d+:\d+(?::\d+)?\s*[AP]M)/i;
            const match = classData.Schedule.match(schedulePattern);
            
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
                
                // Clear all checkboxes first
                document.querySelectorAll('input[name="days"]').forEach(cb => cb.checked = false);
                
                // Check the appropriate days
                for (let i = 0; i < dayCode.length; i++) {
                    const dayName = dayMap[dayCode[i]];
                    if (dayName) {
                        const checkbox = document.querySelector(`input[name="days"][value="${dayName}"]`);
                        if (checkbox) checkbox.checked = true;
                    }
                }
                
                try {
                    // Convert times to 24-hour format for input fields
                    document.getElementById('start-time').value = convertTo24Hour(startTime);
                    document.getElementById('end-time').value = convertTo24Hour(endTime);
                } catch (error) {
                    console.error('Error converting time:', error);
                    // If time conversion fails, leave the fields empty
                    document.getElementById('start-time').value = '';
                    document.getElementById('end-time').value = '';
                }
            }
        }
        
        // Set a random color if not specified
        if (!document.getElementById('color').value) {
            const randomColor = getRandomColor();
            document.getElementById('color').value = randomColor;
        }
    }

    function convertTo24Hour(time12h) {
        // Convert 12-hour format to 24-hour format for time input
        // Handle different formats of time input
        if (!time12h) return '';
        
        // Extract the time and period (AM/PM)
        const timeParts = time12h.match(/(\d+):(\d+)(?::(\d+))?\s*([AP]M)?/i);
        
        if (!timeParts) return '';
        
        let hours = parseInt(timeParts[1], 10);
        const minutes = timeParts[2];
        const period = timeParts[4] || 'AM'; // Default to AM if not specified
        
        // Convert hours based on period (AM/PM)
        if (period.toUpperCase() === 'PM' && hours < 12) {
            hours += 12;
        } else if (period.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
        }
        
        // Format to HH:mm
        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    }

    function getRandomColor() {
        // Generate a random color for the course
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
});