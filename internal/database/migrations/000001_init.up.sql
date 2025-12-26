CREATE TYPE account_type AS ENUM ('expense', 'income');

CREATE TABLE
    accounts (
        id SERIAL PRIMARY KEY,
        -- name of the account
        name VARCHAR(255) NOT NULL,
        -- type of the account: expense or income, default is expense
        type account_type NOT NULL DEFAULT 'expense',
        -- optional note about the account
        note TEXT,
        -- current amount in the account
        amount INT NOT NULL DEFAULT 0,
        -- date and time when the account was created
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        -- date and time when the account was last updated
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        -- date and time when the account was deleted
        deleted_at TIMESTAMPTZ
    );

CREATE TYPE category_type AS ENUM ('expense', 'income', 'transfer');

CREATE TABLE
    categories (
        id SERIAL PRIMARY KEY,
        -- name of the category
        name VARCHAR(255) NOT NULL,
        -- type of the category: expense, income, or transfer, default is expense
        type category_type NOT NULL DEFAULT 'expense',
        -- optional note about the category
        note TEXT,
        -- date and time when the category was created
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        -- date and time when the category was last updated
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        -- date and time when the category was deleted
        deleted_at TIMESTAMPTZ
    );

CREATE TYPE transaction_type AS ENUM ('expense', 'income', 'transfer');

CREATE TABLE
    transactions (
        id SERIAL PRIMARY KEY,
        -- type of the transaction: expense, income, or transfer
        type transaction_type NOT NULL default 'expense',
        --  transaction date and time
        date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        -- amount of the transaction
        amount INT NOT NULL,
        -- foreign key to accounts table
        account_id INT NOT NULL REFERENCES accounts (id),
        -- foreign key to categories table
        category_id INT NOT NULL REFERENCES categories (id),
        -- optional note about the transaction
        note TEXT,
        -- date and time when the transaction was created
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        -- date and time when the transaction was last updated
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
        -- date and time when the transaction was deleted
        deleted_at TIMESTAMPTZ
    );