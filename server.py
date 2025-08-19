from flask import Flask, send_from_directory, jsonify
import os
import requests
from bs4 import BeautifulSoup
import pandas as pd
from datetime import datetime
import time
import logging
import json

app = Flask(__name__, static_folder='public')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('class_processing.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def process_individual_class(session, url, base_payload, headers, class_data, class_index, total_classes):
    """
    Process an individual class and save its response to a file.
    
    Args:
        session: requests.Session object
        url: The URL to post to
        base_payload: Base payload dictionary
        headers: Request headers
        class_data: Dictionary containing class information
        class_index: Current class index (for progress tracking)
        total_classes: Total number of classes
    
    Returns:
        dict: Result containing success status and details
    """
    try:
        # Create a copy of the base payload
        payload = base_payload.copy()
        
        # Check if class has Course Schedule field
        course_schedule = class_data.get("Course Schedule", "")
        if not course_schedule:
            logger.warning(f"Class {class_index+1}/{total_classes}: No 'Course Schedule' field found for class: {class_data.get('Course', 'Unknown')}")
            return {
                "success": False,
                "error": "No Course Schedule field",
                "class": class_data
            }
        
        # Set the event target to the class's Course Schedule
        payload["__EVENTTARGET"] = course_schedule
        
        # Log progress
        course_name = class_data.get('Course', 'Unknown')
        course_title = class_data.get('Course Title', '')
        logger.info(f"Processing class {class_index+1}/{total_classes}: {course_name} - {course_title}")
        
        # Make the request
        response = session.post(url, data=payload, headers=headers)
        response.raise_for_status()
        
        # Create filename with timestamp and course info
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        safe_course_name = "".join(c for c in course_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_course_name = safe_course_name.replace(' ', '_')
        filename = f"class_responses/class_{safe_course_name}_{timestamp}_{class_index+1}.html"
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        # Save response to file
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        logger.info(f"Successfully processed class {class_index+1}/{total_classes}: {course_name} -> {filename}")
        
        # Add delay between requests to be respectful
        time.sleep(1)  # 1 second delay
        
        return {
            "success": True,
            "class": class_data,
            "response_file": filename,
            "response_size": len(response.text)
        }
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error for class {class_index+1}/{total_classes} ({class_data.get('Course', 'Unknown')}): {e}")
        return {
            "success": False,
            "error": str(e),
            "class": class_data
        }
    except Exception as e:
        logger.error(f"Unexpected error for class {class_index+1}/{total_classes} ({class_data.get('Course', 'Unknown')}): {e}")
        return {
            "success": False,
            "error": str(e),
            "class": class_data
        }

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

if __name__ == '__main__':
    # Simple script to extract class data from PCT course schedule
    print(f"Starting class extraction at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Create a session object
    session = requests.Session()

    # URL for the course schedule page
    url = "https://access.pct.edu/CMCPortal/Common/CourseSchedule.aspx"

    # Step 1: Get the initial page to extract the form fields
    print("Fetching initial page...")
    response = session.get(url)
    soup = BeautifulSoup(response.text, "html.parser")

    # Extract the required form fields
    viewstate = soup.find("input", {"name": "__VIEWSTATE"})["value"]
    viewstate_generator = soup.find("input", {"name": "__VIEWSTATEGENERATOR"})["value"]

    # Step 2: Create the minimal payload needed
    print("Preparing search request...")
    payload = {
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

    # Step 3: Send the search request
    print("Sending search request...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"
    }
    response = session.post(url, data=payload, headers=headers)

    # Step 4: Parse the results
    print("Processing response...")
    soup = BeautifulSoup(response.text, "html.parser")

    # Check if we got an error page
    if soup.find("span", {"id": "lblMessage"}):
        print("Error received from server. Saving error page for inspection.")
        with open("error_page.html", "w", encoding="utf-8") as f:
            f.write(response.text)
        print("Error page saved to error_page.html")
        exit()

    # Try to find the table with class data
    class_table = None
    for table_id in ["CourseList", "gvCourseList", "tblCourses"]:
        class_table = soup.find("table", {"id": table_id})
        if class_table:
            break

    # If no table found by ID, look for any large table
    if not class_table:
        tables = soup.find_all("table")
        if tables:
            # Use the table with the most rows
            class_table = max(tables, key=lambda t: len(t.find_all("tr")))

    # Step 5: Extract the data
    classes = []
    if class_table:
        print("Found class data table. Extracting information...")
        
        # Get headers
        headers_row = class_table.find_all("tr")[0]
        headers = [th.get_text(strip=True) for th in headers_row.find_all(["th", "td"])]
        
        # Get data rows
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
                
                classes.append(class_dict)
        
        print(f"Extracted data for {len(classes)} classes.")
        
        # Save initial class list to CSV (as before)
        filename = f"pct_classes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        df = pd.DataFrame(classes)
        df.to_csv(filename, index=False)
        print(f"Initial class list saved to {filename}")
        
        # Process each class individually
        if classes:
            logger.info(f"Starting individual processing of {len(classes)} classes...")
            class_responses = []
            successful_requests = 0
            failed_requests = 0
            
            for i, class_data in enumerate(classes):
                result = process_individual_class(
                    session=session,
                    url=url,
                    base_payload=payload,
                    headers=headers,
                    class_data=class_data,
                    class_index=i,
                    total_classes=len(classes)
                )
                
                class_responses.append(result)
                
                if result["success"]:
                    successful_requests += 1
                else:
                    failed_requests += 1
                    
                # Progress update every 10 classes
                if (i + 1) % 10 == 0 or (i + 1) == len(classes):
                    logger.info(f"Progress: {i+1}/{len(classes)} classes processed. Success: {successful_requests}, Failed: {failed_requests}")
            
            # Save processing summary
            summary = {
                "total_classes": len(classes),
                "successful_requests": successful_requests,
                "failed_requests": failed_requests,
                "processing_time": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "results": class_responses
            }
            
            summary_filename = f"class_responses/processing_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(summary_filename, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, default=str)
            
            logger.info(f"Individual class processing completed!")
            logger.info(f"Total: {len(classes)}, Success: {successful_requests}, Failed: {failed_requests}")
            logger.info(f"Processing summary saved to {summary_filename}")
        else:
            logger.warning("No classes found to process individually.")
    else:
        print("No class data table found in the response.")
        # Save the response for debugging
        with open("response.html", "w", encoding="utf-8") as f:
            f.write(response.text)
        print("Response page saved to response.html for inspection.")

    # host 0.0.0.0 is allows access from any device on the network 
    app.run(host='0.0.0.0', port=8000)