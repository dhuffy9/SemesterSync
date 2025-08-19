from flask import Flask, send_from_directory, jsonify
import os
import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
import logging
import re

app = Flask(__name__, static_folder='public')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('class_extraction.log'),
        logging.StreamHandler()
    ]
)

# Serve static files from the public directory
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

# API endpoint to get class data
@app.route('/api/classes')
def get_classes():
    # Find the latest CSV file
    files = [f for f in os.listdir('.') if f.startswith('pct_classes_') and f.endswith('.csv')]
    if not files:
        return jsonify({"error": "No class data found"}), 404
    latest_file = max(files, key=os.path.getctime)
    df = pd.read_csv(latest_file)
    return df.to_json(orient='records')


def create_session_and_get_initial_page(url):
    """Create a session and get the initial page to extract form fields."""
    logging.info("Creating session and fetching initial page...")
    session = requests.Session()
    
    try:
        response = session.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Extract the required form fields
        viewstate = soup.find("input", {"name": "__VIEWSTATE"})
        viewstate_generator = soup.find("input", {"name": "__VIEWSTATEGENERATOR"})
        
        if not viewstate or not viewstate_generator:
            raise ValueError("Could not find required form fields (__VIEWSTATE or __VIEWSTATEGENERATOR)")
            
        return session, viewstate["value"], viewstate_generator["value"], soup
        
    except Exception as e:
        logging.error(f"Error fetching initial page: {e}")
        raise


def create_search_payload(viewstate, viewstate_generator):
    """Create the payload for the search request."""
    return {
        "__VIEWSTATE": viewstate,
        "__VIEWSTATEGENERATOR": viewstate_generator,
        "__EVENTTARGET": "_ctl0$PlaceHolderMain$_ctl0$btnSearch",
        "__EVENTARGUMENT": "",
        "__LASTFOCUS": "",
        "_ctl0:PlaceHolderMain:_ctl0:cbCampus": "5",
        "_ctl0:PlaceHolderMain:_ctl0:cbTerm": "1196",
        "_ctl0:PlaceHolderMain:_ctl0:txtKeyword": "",
        "_ctl0:PlaceHolderMain:_ctl0:chkMo": "on",
        "_ctl0:PlaceHolderMain:_ctl0:chkTu": "on",
        "_ctl0:PlaceHolderMain:_ctl0:chkWe": "on",
        "_ctl0:PlaceHolderMain:_ctl0:chkTh": "on",
        "_ctl0:PlaceHolderMain:_ctl0:chkFr": "on",
        "_ctl0:PlaceHolderMain:_ctl0:chkSa": "on",
        "_ctl0:PlaceHolderMain:_ctl0:chkSu": "on",
        "_ctl0:PlaceHolderMain:_ctl0:txtCode": "",
        "_ctl0:PlaceHolderMain:_ctl0:Sections": "rbOC",
        "_ctl0:PlaceHolderMain:_ctl0:cbLowTime": "0",
        "_ctl0:PlaceHolderMain:_ctl0:cbHighTime": "23",
        "_ctl0:PlaceHolderMain:_ctl0:chbDeliveryMethod:chbDeliveryMethod_0": "on",
        "_ctl0:PlaceHolderMain:_ctl0:chbDeliveryMethod:chbDeliveryMethod_1": "on",
        "_ctl0:PlaceHolderMain:_ctl0:chbDeliveryMethod:chbDeliveryMethod_2": "on",
        "_ctl0:PlaceHolderMain:_ctl0:chbDeliveryMethod:chbDeliveryMethod_3": "on",
        "_ctl0:PlaceHolderMain:_ctl0:chbDeliveryMethod:chbDeliveryMethod_4": "on",
    }


def extract_course_schedule_identifiers(row):
    """Extract Course Schedule identifier from a table row."""
    # Look for links or elements that could be used as __EVENTTARGET
    links = row.find_all("a")
    for link in links:
        href = link.get("href", "")
        if "javascript:__doPostBack" in href:
            # Extract the target from javascript:__doPostBack('target','')
            match = re.search(r"__doPostBack\('([^']+)'", href)
            if match:
                return match.group(1)
    
    # Alternative: look for input elements with specific patterns
    inputs = row.find_all("input")
    for inp in inputs:
        name = inp.get("name", "")
        if "CourseSchedule" in name or "Schedule" in name:
            return name
    
    return None


def extract_classes_from_table(soup):
    """Extract class data from the HTML table."""
    logging.info("Looking for class data table...")
    
    # Try to find the table with class data
    class_table = None
    for table_id in ["CourseList", "gvCourseList", "tblCourses"]:
        class_table = soup.find("table", {"id": table_id})
        if class_table:
            logging.info(f"Found class table with ID: {table_id}")
            break

    # If no table found by ID, look for any large table
    if not class_table:
        tables = soup.find_all("table")
        if tables:
            # Use the table with the most rows
            class_table = max(tables, key=lambda t: len(t.find_all("tr")))
            logging.info(f"Using largest table with {len(class_table.find_all('tr'))} rows")

    if not class_table:
        logging.error("No class data table found")
        return [], []

    logging.info("Extracting class information from table...")
    
    # Get headers
    headers_row = class_table.find_all("tr")[0]
    headers = [th.get_text(strip=True) for th in headers_row.find_all(["th", "td"])]
    
    # Get data rows and extract both class data and schedule identifiers
    classes = []
    schedule_identifiers = []
    
    for row in class_table.find_all("tr")[1:]:  # Skip header row
        cells = row.find_all("td")
        if cells:
            class_data = [cell.get_text(strip=True) for cell in cells]
            
            # Create a dictionary for this class
            class_dict = {}
            for i, value in enumerate(class_data):
                if i < len(headers):
                    header = headers[i] if headers[i] else f"Column{i+1}"
                    class_dict[header] = value
                else:
                    class_dict[f"Column{i+1}"] = value
            
            # Extract the Course Schedule identifier
            schedule_id = extract_course_schedule_identifiers(row)
            if schedule_id:
                class_dict["_schedule_identifier"] = schedule_id
                schedule_identifiers.append(schedule_id)
            else:
                logging.warning(f"No schedule identifier found for class: {class_dict.get('Course', 'Unknown')}")
            
            classes.append(class_dict)
    
    logging.info(f"Extracted data for {len(classes)} classes, {len(schedule_identifiers)} with schedule identifiers")
    return classes, schedule_identifiers


def create_individual_response_directory():
    """Create directory for individual class responses."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    dir_name = f"individual_class_responses_{timestamp}"
    os.makedirs(dir_name, exist_ok=True)
    logging.info(f"Created directory for individual responses: {dir_name}")
    return dir_name


def process_individual_class(session, url, class_data, viewstate, viewstate_generator, response_dir):
    """Process an individual class by making a separate request."""
    schedule_identifier = class_data.get("_schedule_identifier")
    course_code = class_data.get("Course", "Unknown")
    
    if not schedule_identifier:
        logging.warning(f"No schedule identifier for class {course_code}, skipping individual processing")
        return False
    
    try:
        logging.info(f"Processing individual class: {course_code}")
        
        # Create payload for individual class request
        payload = create_search_payload(viewstate, viewstate_generator)
        payload["__EVENTTARGET"] = schedule_identifier
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
        }
        
        # Make the request
        response = session.post(url, data=payload, headers=headers)
        response.raise_for_status()
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]  # Include milliseconds
        safe_course_code = re.sub(r'[^\w\-_]', '_', course_code)
        filename = f"class_response_{safe_course_code}_{timestamp}.html"
        filepath = os.path.join(response_dir, filename)
        
        # Save the response
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(response.text)
        
        logging.info(f"Saved individual class response: {filename}")
        return True
        
    except Exception as e:
        logging.error(f"Error processing individual class {course_code}: {e}")
        return False


def process_all_individual_classes(session, url, classes, viewstate, viewstate_generator):
    """Process all classes individually."""
    if not classes:
        logging.info("No classes to process individually")
        return
    
    # Create directory for responses
    response_dir = create_individual_response_directory()
    
    logging.info(f"Starting individual processing of {len(classes)} classes...")
    
    successful_count = 0
    failed_count = 0
    
    for i, class_data in enumerate(classes, 1):
        course_code = class_data.get("Course", f"Class_{i}")
        logging.info(f"Processing class {i}/{len(classes)}: {course_code}")
        
        if process_individual_class(session, url, class_data, viewstate, viewstate_generator, response_dir):
            successful_count += 1
        else:
            failed_count += 1
        
        # Brief pause between requests to be respectful
        import time
        time.sleep(0.5)
    
    logging.info(f"Individual processing complete. Success: {successful_count}, Failed: {failed_count}")
    logging.info(f"Individual class responses saved in: {response_dir}")


def perform_bulk_class_extraction():
    """Perform the original bulk class extraction."""
    logging.info("Starting bulk class extraction...")
    
    # URL for the course schedule page
    url = "https://access.pct.edu/CMCPortal/Common/CourseSchedule.aspx"
    
    try:
        # Step 1: Get the initial page and create session
        session, viewstate, viewstate_generator, initial_soup = create_session_and_get_initial_page(url)
        
        # Step 2: Create the search payload
        logging.info("Preparing search request...")
        payload = create_search_payload(viewstate, viewstate_generator)
        
        # Step 3: Send the search request
        logging.info("Sending search request...")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
        }
        response = session.post(url, data=payload, headers=headers)
        response.raise_for_status()
        
        # Step 4: Parse the results
        logging.info("Processing response...")
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Check if we got an error page
        if soup.find("span", {"id": "lblMessage"}):
            logging.error("Error received from server. Saving error page for inspection.")
            with open("error_page.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            logging.info("Error page saved to error_page.html")
            return
        
        # Step 5: Extract the data
        classes, schedule_identifiers = extract_classes_from_table(soup)
        
        if classes:
            # Save to CSV (existing functionality)
            filename = f"pct_classes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            df = pd.DataFrame(classes)
            # Remove the internal schedule identifier from CSV export
            if "_schedule_identifier" in df.columns:
                df_export = df.drop("_schedule_identifier", axis=1)
            else:
                df_export = df
            df_export.to_csv(filename, index=False)
            logging.info(f"Bulk data saved to {filename}")
            
            # NEW FUNCTIONALITY: Process each class individually
            process_all_individual_classes(session, url, classes, viewstate, viewstate_generator)
            
        else:
            logging.error("No class data table found in the response.")
            # Save the response for debugging
            with open("response.html", "w", encoding="utf-8") as f:
                f.write(response.text)
            logging.info("Response page saved to response.html for inspection.")
    
    except Exception as e:
        logging.error(f"Error during bulk class extraction: {e}")
        raise

# Main execution
if __name__ == '__main__':
    import sys
    
    # Check if we should run the extraction or just the web server
    if len(sys.argv) > 1 and sys.argv[1] == "--server-only":
        logging.info("Starting web server only (skipping class extraction)")
    else:
        # Perform the class extraction
        try:
            perform_bulk_class_extraction()
        except Exception as e:
            logging.error(f"Class extraction failed: {e}")
            # Continue to start the web server even if extraction fails
    
    # Start the Flask web server
    logging.info("Starting Flask web server...")
    app.run(host='0.0.0.0', port=8000)