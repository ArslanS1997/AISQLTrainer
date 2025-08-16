import dspy
from typing import List

import os


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
    - DONOT INCLUDE COMMENTS AS NO HUMAN WILL READ THIS SCHEMA
    - KEEP MAXIMUM TO SCHEMA 7 TABLES!
    - DO NOT TRY to add foreign_key etc relationships
    - DONOT USE ORDER OR OTHER RESERVED KEYWORDS IN SQL FOR TABLENAMES/COLUMN NAMES LIKE
            all,analyse,analyze,and,any,array,as,asc,asymmetric,both,case,cast,check,collate,column,constraint,create,default,
            deferrable,desc,describe,distinct,do,else,end,except,false,fetch,for,foreign,from,group,having,in,initially,intersect,
            into,lambda,lateral,leading,limit,not,null,offset,on,only,or,order,pivot,pivot_longer,pivot_wider,placing,primary,
            qualify,references,returning,select,show,some,summarize,symmetric,table,then,to,trailing,true,union,unique,unpivot,
            using,variadic,when,where,window,with
            
    
    """
    user_prompt = dspy.InputField(desc="The prompt the user has given on what schema they want you to generate")
    schema_sql = dspy.OutputField(desc="The SCHEMA SQL for the requested prompt")

class populate_table(dspy.Signature):
    """
    Generate Python code to populate a DuckDB table with 250 realistic rows.

    REQUIREMENTS:
    - Create table using provided schema
    - Insert exactly 250 rows with realistic data
    - Use parameterized queries: `conn.execute(query, values)`
    - Honor ALL constraints (NOT NULL, UNIQUE, CHECK, foreign keys)
    - Use faker, random, numpy for data generation
    - Connection `conn` already exists - don't import/connect DuckDB

    CRITICAL - DATE HANDLING:
    Generate date objects first, then convert to strings:
    ```python
    start_obj = fake.date_between(start_date='-5y', end_date='-1y')
    end_obj = fake.date_between(start_date=start_obj, end_date='today')  # Use object, not string
    start_date = start_obj.isoformat()
    CONSTRAINTS:

    Foreign keys: Populate parent tables first, use valid references
    NOT NULL: Always provide meaningful values
    UNIQUE: Use fake.unique.* methods
    Realistic data: Match column names (email→fake.email(), price→realistic prices)

    EXAMPLE:
    Schema: CREATE TABLE users (id INTEGER, name VARCHAR NOT NULL, email VARCHAR UNIQUE, active BOOLEAN NOT NULL);
    Output:

    from faker import Faker
    import random

    fake = Faker()
    conn.execute("CREATE TABLE users (id INTEGER, name VARCHAR NOT NULL, email VARCHAR UNIQUE, active BOOLEAN NOT NULL)")

    insert_query = "INSERT INTO users VALUES (?, ?, ?, ?)"
    for i in range(1, 251):
        name = fake.name()
        email = fake.unique.email()
        active = random.choice([True, False])
        conn.execute(insert_query, (i, name, email, active))
    Return only the Python code, NO COMMENTS SINCE HUMANS WON"T READ THIS!

    Try to be concise!
    """
    table_schema = dspy.InputField(desc="The DuckDB SQL schema for the table")
    python_code:str = dspy.OutputField(desc="Python code that generates simulated data & adds it via DuckDB SQL, only Python code here")


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
    - Generate a List[str] of 10 questions
    - Questions should be clearly worded and directly related to the schema.
    -
      - IF QUESTIONS ARE RELATED TO MAKE SURE TO RESTATE THE WHOLE QUESTION
    """
    db_schema = dspy.InputField(desc="The schema of the DuckDB database")
    topic = dspy.InputField(desc="The SQL topic user wants to learn", default="All")
    questions: List[str] = dspy.OutputField(desc="10 questions separated by commas for basic difficulty")

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
    - Generate a List[str] of 10 questions
    - Questions should be clearly worded, relevant to the schema, and encourage deeper understanding of SQL logic.
     - Seperate questions by , don't use that anywhere else except for seperation
       - IF QUESTIONS ARE RELATED TO MAKE SURE TO RESTATE THE WHOLE QUESTION
    """
    db_schema = dspy.InputField(desc="The schema of the DuckDB database")
    topic = dspy.InputField(desc="The SQL topic user wants to learn", default="All")
    questions: List[str] = dspy.OutputField(desc="10 questions separated by commas for intermediate difficulty")

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
    - Generate a List[str] of 10 questions
    - Questions should be challenging, realistic, and require multiple steps to solve.
     - IF QUESTIONS ARE RELATED TO MAKE SURE TO RESTATE THE WHOLE QUESTION
    
    """
    db_schema = dspy.InputField(desc="The schema of the DuckDB database")
    topic = dspy.InputField(desc="The SQL topic user wants to learn", default="All")
    questions: List[str] = dspy.OutputField(desc="10 questions separated by commas for hard difficulty")


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
You are an AI SQL tutor helping beginners understand and correct their SQL mistakes in a supportive, non-technical way.

Given:
- `error_generated`: This is the exact error message returned by the DuckDB engine after running a SQL query.
- `faulty_sql`: This is the original incorrect SQL query that caused the error.

Your task:
1. Carefully analyze both the error message and the query to figure out *exactly* what the user did wrong.
2. Write a short, easy-to-understand paragraph explaining the mistake in plain English — imagine you're explaining it to someone new to SQL.
   - Avoid jargon or overly technical terms.
   - If helpful, use simple examples or analogies (like explaining a typo in a sentence or choosing the wrong tool for a task).
   - Be kind and encouraging in tone — the goal is to help the user learn and not feel discouraged.
3. Provide a corrected version of the query.
   - Make sure the new query is functional and matches the user's likely intention.
   - DO NOT just repeat the original query — fix the mistake.

Format:
- One paragraph explanation (plain English, helpful tone)
- One corrected query (code block)

Think like a patient tutor. Focus on understanding, not just fixing.
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

class code_fix(dspy.Signature):
    """
    You are an expert in data analytics and Python code repair.

    Another agent has attempted to write Python code that populates a DuckDB table using the provided schema, 
    but the code has failed due to an error.

    Your task is to:

    1. Carefully analyze the faulty Python code and the specific error message.
    2. Identify and fix only the **minimal** code necessary to resolve the error.
    3. Ensure the fixed code still performs its intended function: populating the table as per the provided DuckDB `CREATE TABLE` schema.
    4. Make sure the corrected code:
        - Uses DuckDB with `conn.execute(...)` (connection already active).
        - Uses only standard libraries like `faker`, `random`, `datetime`, or `numpy`.
        - Handles dates, constraints, and parameterized SQL correctly.
        - Runs **end-to-end without errors**.

     Only fix the code where needed. Do **not** rewrite or modify correct logic.  
     Do **not** return explanations, comments, or extra text — only the final fixed code.

    Inputs:
    - `faulty_code`: the original Python code that caused an error.
    - `error`: the exact error message that was raised.
    - `schema_ddl`: the `CREATE TABLE` SQL schema used to guide data generation.

    Output:
    - `fixed_code`: the corrected version of the Python code that runs successfully.

    Example:
    Input:
    faulty_code = '''
    from faker import Faker
    import random

    fake = Faker()

    insert_query = "INSERT INTO God VALUES (?, ?, ?, ?, ?)"
    for i in range(1, 251):
        name = fake.name()
        domain = random.choice(['War', 'Love', 'Wisdom', 'Nature', 'Death', 'Fertility', 'Justice', 'Chaos'])
        attributes = ', '.join(fake.words(random.randint(1, 5)))
        creation_date = fake.date_between(start_date='-5000-01-01', end_date='today').isoformat()
        conn.execute(insert_query, (i, name, domain, attributes, creation_date))
    '''
    
    error = "Can't parse date string `-5000-01-01`"

    schema_ddl = '''
    CREATE TABLE God (
        id INTEGER PRIMARY KEY,
        name VARCHAR NOT NULL,
        domain VARCHAR NOT NULL,
        attributes TEXT,
        creation_date DATE NOT NULL
    );
    '''

    Output:
    fixed_code = '''
    from faker import Faker
    import random

    fake = Faker()

    insert_query = "INSERT INTO God VALUES (?, ?, ?, ?, ?)"
    for i in range(1, 251):
        name = fake.name()
        domain = random.choice(['War', 'Love', 'Wisdom', 'Nature', 'Death', 'Fertility', 'Justice', 'Chaos'])
        attributes = ', '.join(fake.words(random.randint(1, 5)))
        creation_date = fake.date_between(start_date='-2000y', end_date='today').isoformat()
        conn.execute(insert_query, (i, name, domain, attributes, creation_date))
    '''
    """
    faulty_code = dspy.InputField(desc="The faulty Python code")
    errors = dspy.InputField(desc="The raised error message")
    schema_ddl = dspy.InputField(desc="The DuckDB CREATE TABLE schema")
    fixed_code = dspy.OutputField(desc="The corrected Python code")



class redo_schema(dspy.Signature):
    """
    Given a user query, a previously generated DuckDB schema that failed to execute,
    and the specific error produced by the DuckDB engine, generate a corrected DuckDB schema.

    The new schema must:
    - Avoid the error described.
    - Fulfill the intent of the original user query.
    - Include all necessary tables, fields, and datatypes.

    Input:
    - user_query: Natural language description of what the user wants.
    - previous_schema: The invalid schema that was generated earlier.
    - error: The specific error message from DuckDB.

    Output:
    - new_schema: A corrected and functional DuckDB schema that satisfies the user query.
    """

    user_query = dspy.InputField(desc="The user query for schema generation")
    previous_schema = dspy.InputField(desc="The schema that caused a generation error in duckDB")
    errors = dspy.InputField(desc="The error generated by the DuckDB engine")
    schema_sql = dspy.OutputField(desc="The new duckdb schema that avoids the error, it must answer the query as well")


import dspy

class sql_generator(dspy.Signature):
    """
    Given a natural language question and a database schema, generate a syntactically correct SQL query
    compatible with DuckDB that accurately answers the question. Use only the tables and columns explicitly 
    present in the provided schema. Ensure proper SQL syntax, including JOINs, WHERE clauses, GROUP BY, 
    ORDER BY, and aggregation functions when necessary.

    Follow these constraints:
    - Do not assume relationships between tables unless they are clearly defined by column names (e.g., foreign keys).
    - Use fully qualified column names when querying from multiple tables (e.g., table_name.column_name).
    - Use DuckDB-compatible syntax (similar to PostgreSQL), avoiding unsupported functions.
    - Apply LIMIT clauses for large or unbounded result sets if appropriate.
    - Do not return explanatory text — only the SQL query.

    Example:
    Question:
    "List the top 5 products (by name) that generated the highest total revenue in 2024."

    Schema:
    Table: products (
        id INTEGER,
        name TEXT,
        category TEXT,
        price FLOAT
    )

    Table: orders (
        id INTEGER,
        order_date DATE,
        customer_id INTEGER
    )

    Table: order_items (
        id INTEGER,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER
    )

    Expected SQL:
    SELECT products.name, SUM(products.price * order_items.quantity) AS total_revenue
    FROM order_items
    JOIN products ON order_items.product_id = products.id
    JOIN orders ON order_items.order_id = orders.id
    WHERE EXTRACT(YEAR FROM orders.order_date) = 2024
    GROUP BY products.name
    ORDER BY total_revenue DESC
    LIMIT 5;
    """

    question = dspy.InputField(desc="The user's natural language question about the database.")
    sql_schema = dspy.InputField(desc="The schema of the database (tables, columns, types, etc).")
    sql = dspy.OutputField(desc="A syntactically correct SQL query (DuckDB-compatible) that answers the question.")


class sql_corrector(dspy.Signature):
    """
    Given a faulty SQL query, the original user question, database schema, and the associated error message,
    return a corrected SQL query that is syntactically valid in DuckDB and semantically answers the original question.

    Constraints:
    - Use only the tables and columns provided in the schema.
    - Fix only what is necessary based on the error message.
    - Follow DuckDB-compatible SQL syntax (similar to PostgreSQL).
    - Do not assume table relationships unless foreign keys or naming conventions clearly imply them.
    - Always ensure joins are explicitly written and column references are unambiguous.
    - Do not return any explanation — only the corrected SQL query.

    Example:
    Question:
    "Show each customer's name along with the total amount they spent on orders in 2023."

    Schema:
    Table: customers (
        id INTEGER,
        name TEXT,
        email TEXT
    )

    Table: orders (
        id INTEGER,
        customer_id INTEGER,
        order_date DATE
    )

    Table: order_items (
        id INTEGER,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        unit_price FLOAT
    )

    Faulty SQL:
    SELECT name, SUM(quantity * unit_price) AS total_spent
    FROM customers
    JOIN orders ON customers.id = orders.customer_id
    JOIN order_items ON orders.id = order_id
    WHERE EXTRACT(YEAR FROM order_date) = 2023
    GROUP BY name;

    Error (DuckDB):
    Binder Error: Column "order_id" not found in scope

    Corrected SQL:
    SELECT customers.name, SUM(order_items.quantity * order_items.unit_price) AS total_spent
    FROM customers
    JOIN orders ON customers.id = orders.customer_id
    JOIN order_items ON orders.id = order_items.order_id
    WHERE EXTRACT(YEAR FROM orders.order_date) = 2023
    GROUP BY customers.name;
    """

    question = dspy.InputField(desc="The user's original natural language question.")
    sql_schema = dspy.InputField(desc="The schema of the database (tables, columns, types, etc).")
    faulty_sql = dspy.InputField(desc="The SQL query that failed to execute.")
    errors = dspy.InputField(desc="The error message returned when executing the faulty SQL.")
    corrected_sql = dspy.OutputField(desc="A corrected SQL query that should execute successfully and answer the question.")



class text2sqlagent(dspy.Module):
    def __init__(self):
        
        self.difficulty_retries ={'basic':1 , 'intermediate':2, 'advanced':4}
        self.sql_genator_agent = dspy.asyncify(dspy.Predict(sql_generator))
        self.sql_corrector = dspy.asyncify(dspy.Predict(sql_corrector))
        self.basic_lm = dspy.LM(model='openai/gpt-4o-mini', api_key=os.environ.get("OPENAI_API_KEY"),max_tokens=5000)
        self.intermediate_lm = dspy.LM('anthropic/claude-3.5-sonnet',api_key=os.environ.get("ANTHROPIC_API_KEY"), max_tokens =5000)
        self.advanced_lm = dspy.LM('gemini/gemini-2.5-pro', api_key=os.environ.get("GEMINI_API_KEY"), max_tokens=7000)
        self.llm_dictionary = {'basic':self.basic_lm, 'intermediate':self.intermediate_lm, 'advanced':self.advanced_lm}


    async def aforward(self, difficulty, question, schema, conn):
        lm = self.llm_dictionary[difficulty.lower()]
        loop = self.difficulty_retries[difficulty.lower()]
        previous_sql = ''
        error = ''
        is_executable = False
        result = ''


        with dspy.context(lm=lm):
            for i in range(loop):
                if i == 0:
                    response = await self.sql_genator_agent(question=question, sql_schema=schema)
                    sql = response.sql.replace('```', '').replace('sql', '')
                else:
                    response = await self.sql_corrector(
                        question=question,
                        sql_schema=schema,
                        faulty_sql=previous_sql,
                        errors=error
                    )
                    sql = response.corrected_sql.replace('```', '').replace('sql', '')
                try:
                    result = conn.execute(sql).fetchall()
                    result = str(result)
                    is_executable = True
                    break
                except Exception as e:
                    is_executable = False
                    error = str(e)
                    previous_sql = sql
                    pass
        return {'sql':sql, 'result':result, 'is_executable':is_executable}
                



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
code_rewritter_agent = dspy.asyncify(dspy.Predict(code_fix))

redo_schema_agent = dspy.asyncify(dspy.Predict(redo_schema))

ai_competitor_agent = dspy.asyncify(text2sqlagent())



    # Use model in your OpenAI/AI calls

