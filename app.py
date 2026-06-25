import os
from flask import Flask, render_template, request, jsonify
import pandas as pd
from db import init_db, get_db, Student

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
            'record_submitted': s.record_submitted
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
        student.record_bought = data['record_bought']
    if 'record_submitted' in data:
        student.record_submitted = data['record_submitted']

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)
