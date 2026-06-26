import os
from flask import Flask, render_template, request, jsonify, make_response
import pandas as pd
from sqlalchemy import or_
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
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    db = next(get_db())
    query = db.query(Student)

    if class_filter:
        query = query.filter(Student.class_name == class_filter)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Student.name.ilike(search_term),
                Student.admission_number.ilike(search_term),
                Student.roll_no.ilike(search_term)
            )
        )
        
    total_count = query.count()
    
    # Apply pagination
    query = query.order_by(Student.id.desc()).limit(per_page).offset((page - 1) * per_page)
    students = query.all()

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

    return jsonify({
        'students': result,
        'total': total_count,
        'page': page,
        'per_page': per_page,
        'total_pages': max((total_count + per_page - 1) // per_page, 1)
    })

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
        reader = csv.DictReader(codecs.iterdecode(file, 'utf-8'))
        added_count = 0
        
        rows = list(reader)
        csv_adm_nos = [row.get('Admission Number', '').strip() for row in rows if row.get('Admission Number')]
        
        existing_students = db.query(Student.admission_number).filter(
            Student.admission_number.in_(csv_adm_nos)
        ).all()
        existing_adm_nos = {s[0] for s in existing_students}
        
        new_students = []
        for row in rows:
            adm_no = row.get('Admission Number', '').strip()
            roll_no = row.get('Roll No', '').strip()
            name = row.get('Name', '').strip()
            
            if adm_no and name and adm_no not in existing_adm_nos:
                new_students.append(Student(
                    roll_no=roll_no,
                    admission_number=adm_no,
                    name=name,
                    class_name=class_name
                ))
                existing_adm_nos.add(adm_no)
                added_count += 1
                
        if new_students:
            db.bulk_save_objects(new_students)
            db.commit()
            
        return jsonify({'message': f'Successfully uploaded {added_count} new students.'})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/students/bulk', methods=['POST'])
def bulk_update_students():
    data = request.json
    student_ids = data.get('student_ids', [])
    field = data.get('field')
    value = data.get('value')
    
    if not student_ids or field not in ['record_bought', 'record_submitted', 'reset']:
        return jsonify({'error': 'Invalid request'}), 400
        
    db = next(get_db())
    
    if field == 'record_bought':
        if value:
            db.query(Student).filter(
                Student.id.in_(student_ids),
                Student.record_bought == False
            ).update({
                "record_bought": True,
                "bought_at": datetime.utcnow()
            }, synchronize_session=False)
        else:
            db.query(Student).filter(
                Student.id.in_(student_ids)
            ).update({
                "record_bought": False,
                "bought_at": None
            }, synchronize_session=False)
            
    elif field == 'record_submitted':
        if value:
            db.query(Student).filter(
                Student.id.in_(student_ids),
                Student.record_submitted == False
            ).update({
                "record_submitted": True,
                "submitted_at": datetime.utcnow()
            }, synchronize_session=False)
        else:
            db.query(Student).filter(
                Student.id.in_(student_ids)
            ).update({
                "record_submitted": False,
                "submitted_at": None
            }, synchronize_session=False)
            
    elif field == 'reset':
        db.query(Student).filter(
            Student.id.in_(student_ids)
        ).update({
            "record_bought": False,
            "bought_at": None,
            "record_submitted": False,
            "submitted_at": None,
            "remarks": ''
        }, synchronize_session=False)

    db.commit()
    return jsonify({'message': f'Successfully updated {len(student_ids)} students'})

@app.route('/api/students/reset_class', methods=['POST'])
def reset_class_students():
    data = request.json
    class_name = data.get('class_name')
    
    if not class_name:
        return jsonify({'error': 'Class name is required'}), 400
        
    db = next(get_db())
    
    updated_count = db.query(Student).filter(
        Student.class_name == class_name
    ).update({
        "record_bought": False,
        "bought_at": None,
        "record_submitted": False,
        "submitted_at": None,
        "remarks": ''
    }, synchronize_session=False)
        
    db.commit()
    return jsonify({'message': f'Successfully reset tracking data for {updated_count} students in {class_name}'})

@app.route('/api/export', methods=['GET'])
def export_students():
    search = request.args.get('search', '').lower()
    class_filter = request.args.get('class_name', '')

    db = next(get_db())
    query = db.query(Student)
    if class_filter:
        query = query.filter(Student.class_name == class_filter)
        
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Student.name.ilike(search_term),
                Student.admission_number.ilike(search_term),
                Student.roll_no.ilike(search_term)
            )
        )
        
    query = query.order_by(Student.id.desc())
    students = query.all()

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

@app.route('/api/classes', methods=['GET'])
def get_classes():
    db = next(get_db())
    classes = db.query(Student.class_name).distinct().all()
    # Handle both string values and empty strings safely
    return jsonify([c[0] for c in classes if c[0]])

if __name__ == '__main__':
    app.run(debug=True, port=5000)
