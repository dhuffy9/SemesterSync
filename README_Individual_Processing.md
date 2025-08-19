# SemesterSync Individual Class Processing

This update adds functionality to process each class individually by making separate requests to get detailed class information.

## New Features

### Individual Class Processing
- **Separate Requests**: Each class is now processed individually using its "Course Schedule" identifier as the `__EVENTTARGET`
- **Detailed Responses**: Each class response is saved to a separate file for detailed analysis
- **Error Handling**: Comprehensive logging and error handling for individual class processing
- **Progress Tracking**: Real-time logging of processing progress and status

### File Organization
- Individual class responses are saved in timestamped directories: `individual_class_responses_YYYYMMDD_HHMMSS/`
- Response files are named: `class_response_{course_code}_{timestamp}.html`
- Log files track all processing activity: `class_extraction.log`

### Maintained Functionality
- Original bulk CSV export functionality is preserved
- Flask web server and API endpoints remain unchanged
- All existing features continue to work as before

## Usage

### Standard Mode (Bulk + Individual Processing)
```bash
python3 server.py
```
This will:
1. Extract all classes in bulk (original functionality)
2. Save to CSV file as before
3. Process each class individually
4. Save individual responses to separate files
5. Start the Flask web server

### Server-Only Mode
```bash
python3 server.py --server-only
```
Starts only the Flask web server without performing class extraction.

## Code Structure

### New Functions
- `create_session_and_get_initial_page()`: Session management and initial page handling
- `extract_course_schedule_identifiers()`: Extract identifiers from HTML table rows
- `extract_classes_from_table()`: Enhanced table parsing with identifier extraction
- `process_individual_class()`: Process a single class with detailed error handling
- `process_all_individual_classes()`: Coordinate processing of all classes
- `create_individual_response_directory()`: Directory management for responses

### Enhanced Error Handling
- Comprehensive logging at INFO, WARNING, and ERROR levels
- Graceful handling of missing schedule identifiers
- Continued processing even if individual requests fail
- Detailed progress reporting and statistics

## Testing

The implementation includes comprehensive tests:
- Mock data testing for offline development
- Function-level unit tests
- Integration testing with demonstration script

## File Management

### Generated Files
- `pct_classes_YYYYMMDD_HHMMSS.csv` - Bulk class data (original functionality)
- `individual_class_responses_YYYYMMDD_HHMMSS/` - Directory for individual responses
- `class_response_{course_code}_{timestamp}.html` - Individual class detail files
- `class_extraction.log` - Processing log file

### Excluded Files (.gitignore)
- All CSV files (`*.csv`)
- Individual response directories (`individual_class_responses_*/`)
- Individual response files (`class_response_*.html`)
- Log files (`*.log`)
- Debug files (`error_page.html`, `response.html`)

## Benefits

1. **Detailed Analysis**: Individual files allow for in-depth analysis of specific classes
2. **Better Debugging**: Separate files make it easier to identify issues with specific classes
3. **Preserved Functionality**: All existing features continue to work unchanged
4. **Comprehensive Logging**: Detailed logs help track processing and identify issues
5. **Error Resilience**: Processing continues even if individual requests fail
6. **Organized Output**: Timestamped directories keep responses organized