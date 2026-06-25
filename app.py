import os
from flask import Flask, render_template, request, jsonify, make_response
import pandas as pd
from db import init_db, get_db, Student
from datetime import datetime
import io
import csv

app = Flask(__name__)

# Initialize database
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/students', methods=['GET'])
def get_students():
    search = request.args.get('search', '').lower()
    class_filter = request.args.get('class_name', '')

    db = next(get_db())
    query = db.query(Student)

    if class_filter:
        query = query.filter(Student.class_name == class_filter)

    students = query.all()

    if search:
        students = [s for s in students if search in str(s.name).lower() or search in str(s.admission_number).lower() or search in str(s.roll_no).lower()]

    result = []
    for s in students:
        result.append({
            'id': s.id,
            'roll_no': s.roll_no,
            'admission_number': s.admission_number,
            'name': s.name,
            'class_name': s.class_name,
            'record_bought': s.record_bought,
            'bought_at': s.bought_at.isoformat() if s.bought_at else None,
            'record_submitted': s.record_submitted,
            'submitted_at': s.submitted_at.isoformat() if s.submitted_at else None,
            'remarks': s.remarks
        })

    return jsonify(result)

@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.json
    db = next(get_db())

    # Check if student already exists
    existing = db.query(Student).filter(Student.admission_number == data.get('admission_number')).first()
    if existing:
        return jsonify({'error': 'Student with this admission number already exists'}), 400

    new_student = Student(
        roll_no=data.get('roll_no'),
        admission_number=data.get('admission_number'),
        name=data.get('name'),
        class_name=data.get('class_name')
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return jsonify({'message': 'Student added successfully', 'id': new_student.id})

@app.route('/api/students/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    data = request.json
    db = next(get_db())
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    if 'record_bought' in data:
        if data['record_bought'] and not student.record_bought:
            student.bought_at = datetime.utcnow()
        elif not data['record_bought']:
            student.bought_at = None
        student.record_bought = data['record_bought']

    if 'record_submitted' in data:
        if data['record_submitted'] and not student.record_submitted:
            student.submitted_at = datetime.utcnow()
        elif not data['record_submitted']:
            student.submitted_at = None
        student.record_submitted = data['record_submitted']

    if 'remarks' in data:
        student.remarks = data['remarks']

    db.commit()
    return jsonify({'message': 'Student updated successfully'})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    class_name = request.form.get('class_name', 'Unknown')

    try:
        # Read the file without headers since the sample file doesn't have them
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file, header=None)
        elif file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
            df = pd.read_excel(file, header=None)
        else:
            return jsonify({'error': 'Unsupported file type'}), 400
        
        db = next(get_db())
        added_count = 0
        
        # Iterate over the rows
        # Format expected: Index 1: Roll No, Index 2: Admission No, Index 3: Name
        for index, row in df.iterrows():
            if len(row) >= 4:
                roll_no = str(row[1]) if not pd.isna(row[1]) else None
                adm_no = str(row[2]) if not pd.isna(row[2]) else None
                name = str(row[3]) if not pd.isna(row[3]) else None

                if adm_no and name:
                    # Check if already exists to avoid UniqueConstraint errors
                    existing = db.query(Student).filter(Student.admission_number == adm_no).first()
                    if not existing:
                        student = Student(
                            roll_no=roll_no,
                            admission_number=adm_no,
                            name=name,
                            class_name=class_name
                        )
                        db.add(student)
                        added_count += 1
        
        db.commit()
        return jsonify({'message': f'Successfully uploaded {added_count} students.'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/students/bulk', methods=['POST'])
def bulk_update_students():
    data = request.json
    student_ids = data.get('student_ids', [])
    field = data.get('field')
    value = data.get('value')
    
    if not student_ids or field not in ['record_bought', 'record_submitted']:
        return jsonify({'error': 'Invalid request'}), 400
        
    db = next(get_db())
    students = db.query(Student).filter(Student.id.in_(student_ids)).all()
    
    for student in students:
        if field == 'record_bought':
            if value and not student.record_bought:
                student.bought_at = datetime.utcnow()
            elif not value:
                student.bought_at = None
            student.record_bought = value
        elif field == 'record_submitted':
            if value and not student.record_submitted:
                student.submitted_at = datetime.utcnow()
            elif not value:
                student.submitted_at = None
            student.record_submitted = value

    db.commit()
    return jsonify({'message': f'Successfully updated {len(students)} students'})

@app.route('/api/export', methods=['GET'])
def export_students():
    search = request.args.get('search', '').lower()
    class_filter = request.args.get('class_name', '')

    db = next(get_db())
    query = db.query(Student)
    if class_filter:
        query = query.filter(Student.class_name == class_filter)
    students = query.all()
    if search:
        students = [s for s in students if search in str(s.name).lower() or search in str(s.admission_number).lower() or search in str(s.roll_no).lower()]

    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['Roll No', 'Admission Number', 'Name', 'Class', 'Record Bought', 'Bought At', 'Record Submitted', 'Submitted At', 'Remarks'])
    
    for s in students:
        cw.writerow([
            s.roll_no, 
            s.admission_number, 
            s.name, 
            s.class_name, 
            'Yes' if s.record_bought else 'No',
            s.bought_at.strftime("%Y-%m-%d %H:%M") if s.bought_at else '',
            'Yes' if s.record_submitted else 'No',
            s.submitted_at.strftime("%Y-%m-%d %H:%M") if s.submitted_at else '',
            s.remarks or ''
        ])
    
    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = "attachment; filename=students_export.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@app.route('/api/analytics', methods=['GET'])
def get_analytics():
    db = next(get_db())
    students = db.query(Student).all()
    
    total = len(students)
    bought = sum(1 for s in students if s.record_bought)
    submitted = sum(1 for s in students if s.record_submitted)
    
    classes = {}
    for s in students:
        c = s.class_name
        if c not in classes:
            classes[c] = {'total': 0, 'bought': 0, 'submitted': 0}
        classes[c]['total'] += 1
        if s.record_bought: classes[c]['bought'] += 1
        if s.record_submitted: classes[c]['submitted'] += 1
        
    return jsonify({
        'total': total,
        'bought': bought,
        'submitted': submitted,
        'classes': classes
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
