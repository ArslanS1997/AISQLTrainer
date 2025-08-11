import dspy

class create_schema(dspy.Signature):
    """
    You are a schema generation assistant. Given a natural language description of the data or entities
    the user wants to store, generate a SQL CREATE TABLE schema that defines appropriate tables, columns, 
    and data types. Use sensible names, appropriate data types, and include primary keys. If multiple tables 
    are needed, include foreign key relationships where applicable. Return only the SQL schema.

    Example:
    User Prompt: "I want to store information about books, authors, and publishers. Each book has a title, 
    publication year, genre, and is written by one or more authors. Each author has a name and birth year. 
    Each publisher has a name and address."

    Output: A valid SQL schema containing CREATE TABLE statements to represent this data model.

    Your are using duckDB SQL, which is based on SQLite
    - DO NOT TRY to add foreign_key etc relationships
    
    
    """
    user_prompt = dspy.InputField(desc="The prompt the user has given on what schema they want you to generate")
    schema_sql = dspy.OutputField(desc="The SCHEMA SQL for the requested prompt")

class populate_table(dspy.Signature):
    """
    You are provided with a DuckDB SQL table schema.

    Your task is to write complete Python code that:
    - Uses DuckDB in Python.
    - Generates 250 rows of realistic simulated data based on column types and names.
    - Uses libraries such as `faker`, `random`, or `numpy` for data generation.
    - Creates the table using the exact schema provided.
    - Inserts the generated rows using DuckDB SQL INSERT statements (no DataFrame insertion).
    - Uses parameterized queries to avoid SQL injection and ensure clean formatting.
    - No need to import duckdb or connect it is already connected as conn
    - Do not do conn = duckdb.connect(), it is already connected
    - Take care of the foreign key relations, ensuring you add in good sequence!

    Do not return anything except the Python code.

    One-shot Example:

    Input
    table_schema = '''
    CREATE TABLE users (
        user_id INTEGER,
        full_name VARCHAR,
        email VARCHAR,
        age INTEGER,
        join_date DATE,
        is_active BOOLEAN
    );
    '''

    Output
    python_code = '''
    from faker import Faker
    import random
    from datetime import datetime, timedelta

    # Initialize
    fake = Faker()


    # Insert 250 rows
    insert_query = "INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)"
    for i in range(1, 251):
        full_name = fake.name()
        email = fake.email()
        age = random.randint(18, 70)
        join_date = fake.date_between(start_date='-3y', end_date='today').isoformat()
        is_active = random.choice([True, False])
        conn.execute(insert_query, (i, full_name, email, age, join_date, is_active))
    '''
    """
    table_schema = dspy.InputField(desc="The DuckDB SQL schema for the table")
    python_code = dspy.OutputField(desc="Python code that generates simulated data & adds it via DuckDB SQL")

class basic_questions_gen(dspy.Signature):
    """
    You are part of an AI-powered SQL training system designed to help beginners learn SQL through guided practice.
    
    Given:
    - A DuckDB database schema (`db_schema`) which includes tables and their columns.
    - An optional topic (`topic`) such as SELECT, WHERE, JOIN, GROUP BY, etc.

    Your task:
    - Generate 5 beginner-level SQL questions based on the provided schema and topic.
    - If the topic is 'All', cover a variety of fundamental SQL concepts like:
        - SELECT specific columns
        - Filtering with WHERE
        - Sorting using ORDER BY
        - Using aggregate functions like COUNT or SUM
        - Limiting output with LIMIT

    Format:
    - Return a single string with the 5 questions separated by commas.
    - Questions should be clearly worded and directly related to the schema.
    """
    db_schema = dspy.InputField(desc="The schema of the DuckDB database")
    topic = dspy.InputField(desc="The SQL topic user wants to learn", default="All")
    questions = dspy.OutputField(desc="5 questions separated by commas for basic difficulty")

class intermediate_questions_gen(dspy.Signature):
    """
    You are part of an AI-powered SQL training system designed to help users advance their SQL skills through practical exercises.

    Given:
    - A DuckDB database schema (`db_schema`) which includes tables and their columns.
    - An optional topic (`topic`) such as JOINs, GROUP BY, subqueries, etc.

    Your task:
    - Generate 5 intermediate-level SQL practice questions that go beyond the basics.
    - If the topic is 'All', include a mix of intermediate concepts like:
        - Multi-table JOINs (INNER, LEFT)
        - GROUP BY with aggregate functions
        - HAVING clause usage
        - Subqueries in SELECT or WHERE
        - Filtering with IN, BETWEEN, or LIKE

    Format:
    - Return a single string with the 5 questions separated by commas.
    - Questions should be clearly worded, relevant to the schema, and encourage deeper understanding of SQL logic.
    """
    db_schema = dspy.InputField(desc="The schema of the DuckDB database")
    topic = dspy.InputField(desc="The SQL topic user wants to learn", default="All")
    questions = dspy.OutputField(desc="5 questions separated by commas for intermediate difficulty")

class hard_questions_gen(dspy.Signature):
    """
    You are part of an AI-powered SQL training system designed to help users master advanced SQL techniques through complex exercises.

    Given:
    - A DuckDB database schema (`db_schema`) which includes tables and their columns.
    - An optional topic (`topic`) such as advanced JOINs, window functions, CTEs, advanced subqueries, etc.

    Your task:
    - Generate 5 hard-level SQL practice questions that challenge the user’s mastery of SQL.
    - If the topic is 'All', include a mix of advanced SQL concepts such as:
        - Writing nested subqueries with correlation
        - Using CTEs (WITH clause)
        - Applying window functions (e.g., RANK, ROW_NUMBER)
        - Complex filtering and multi-level aggregation
        - Advanced set operations like INTERSECT, EXCEPT

    Format:
    - Return a single string with the 5 questions separated by commas.
    - Questions should be challenging, realistic, and require multiple steps to solve.
    """
    db_schema = dspy.InputField(desc="The schema of the DuckDB database")
    topic = dspy.InputField(desc="The SQL topic user wants to learn", default="All")
    questions = dspy.OutputField(desc="5 questions separated by commas for hard difficulty")


class question_generator(dspy.Module):
    def __init__(self):
        self.question_generators = {
            'basic': dspy.Predict(basic_questions_gen),
            'intermediate': dspy.Predict(intermediate_questions_gen),
            'advanced': dspy.Predict(hard_questions_gen)
        }
    def forward(self,schema, topic, difficulty):
        generator = self.question_generators[difficulty.lower()]
        response = generator(db_schema=schema, topic=topic)
        return response





class explanation_gen(dspy.Signature):
    """
    You are part of an AI-powered SQL training system that helps users understand and learn from their mistakes.

    Given:
    - `error_generated`: The error message returned by the SQL engine (DuckDB) after executing a query.
    - `faulty_sql`: The original SQL query written by the user that caused the error.

    Your task:
    - Analyze the error message and the SQL query.
    - Generate a clear, beginner-friendly explanation of what went wrong in the SQL query.
    - Avoid technical jargon where possible.
    - Focus on helping the user understand the mistake so they can learn and fix it.

    Format:
    - Output a single paragraph in simple English.
    - Use analogies or examples if it helps clarify the issue.
    """
    error_generated = dspy.InputField(desc="The error generated by the system")
    faulty_sql = dspy.InputField(desc="The SQL user entered into the system")
    explanation = dspy.OutputField(desc="A simple language explanation for the faulty SQL")

class check_answer(dspy.Signature):
    """
    You are an AI SQL trainer. A question was asked, and the user responded with a SQL query.
    You are given:
    - The original question.
    - The user's SQL query.
    - The head of the resulting table when the SQL was executed.

    Your job:
    1. Decide whether the SQL correctly answers the question. Return `True` if it does, otherwise `False`.
    2. Provide a brief 2-line explanation justifying your evaluation. Mention specific reasons the SQL is correct or where it fails (e.g., incorrect filter, missing column, wrong aggregation, etc.).
    """
    question = dspy.InputField(desc="The original natural language question that was asked")
    sql = dspy.InputField(desc="The SQL query written by the user in response to the question")
    table_head = dspy.InputField(desc="The first few rows of the result from executing the SQL query")
    is_correct: bool = dspy.OutputField(desc="True or False — whether the SQL correctly answers the question")
    explanation = dspy.OutputField(desc="A concise 2-line explanation of why the SQL is correct or not")

    

# lm = dspy.LM(model="openai/gpt-4o-mini", max_tokens=1024)
# dspy.settings.configure(lm=lm)
create_schema_agent = dspy.asyncify(dspy.Predict(create_schema))
populate_table_agent = dspy.asyncify(dspy.Predict(populate_table))
# basic_questions_gen_agent = dspy.asyncify(dspy.Predict(basic_questions_gen))
# hard_questions_gen_agent = dspy.asyncify(dspy.Predict(hard_questions_gen))
# intermediate_questions_gen_agent = dspy.asyncify(dspy.Predict(intermediate_questions_gen))
question_generator_agent = dspy.asyncify(question_generator())
explanation_gen_agent = dspy.asyncify(dspy.Predict(explanation_gen))
check_correct_agent = dspy.asyncify(dspy.Predict(check_answer))

