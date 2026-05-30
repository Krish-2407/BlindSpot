const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

// Mock database for local testing when service keys are missing or tables are locked
class SupabaseMock {
  constructor() {
    this.sessions = [];
    this.conversations = [];
    this.results = [];
  }

  from(table) {
    const list = this[table] || [];
    let filterField = null;
    let filterVal = null;
    let orderField = null;
    let orderAsc = true;
    let limitVal = null;
    let updateObj = null;
    let isInsert = false;
    let insertedItems = [];

    const builder = {
      insert: (arr) => {
        isInsert = true;
        insertedItems = arr.map(item => {
          const newItem = { id: 'mock-' + Math.random().toString(36).substring(2, 9), created_at: new Date().toISOString(), ...item };
          list.push(newItem);
          return newItem;
        });
        return builder;
      },
      update: (obj) => {
        updateObj = obj;
        return builder;
      },
      select: (fields) => {
        return builder;
      },
      eq: (field, val) => {
        filterField = field;
        filterVal = val;
        return builder;
      },
      order: (field, opts) => {
        orderField = field;
        orderAsc = opts?.ascending !== false;
        return builder;
      },
      limit: (val) => {
        limitVal = val;
        return builder;
      },
      single: () => {
        const results = list.filter(item => !filterField || item[filterField] === filterVal);
        if (orderField) {
          results.sort((a, b) => {
            if (a[orderField] < b[orderField]) return orderAsc ? -1 : 1;
            if (a[orderField] > b[orderField]) return orderAsc ? 1 : -1;
            return 0;
          });
        }
        const data = results[0] || null;
        return { data, error: data ? null : new Error("Not found") };
      },
      maybeSingle: () => {
        const results = list.filter(item => !filterField || item[filterField] === filterVal);
        if (orderField) {
          results.sort((a, b) => {
            if (a[orderField] < b[orderField]) return orderAsc ? -1 : 1;
            if (a[orderField] > b[orderField]) return orderAsc ? 1 : -1;
            return 0;
          });
        }
        const data = results[0] || null;
        return { data, error: null };
      },
      then: (resolve, reject) => {
        if (isInsert) {
          resolve({ data: insertedItems, error: null });
          return;
        }
        if (updateObj) {
          const itemsToUpdate = list.filter(item => !filterField || item[filterField] === filterVal);
          itemsToUpdate.forEach(item => {
            Object.assign(item, updateObj);
          });
          resolve({ data: itemsToUpdate, error: null });
          return;
        }
        let results = list.filter(item => !filterField || item[filterField] === filterVal);
        if (orderField) {
          results.sort((a, b) => {
            if (a[orderField] < b[orderField]) return orderAsc ? -1 : 1;
            if (a[orderField] > b[orderField]) return orderAsc ? 1 : -1;
            return 0;
          });
        }
        if (limitVal !== null) {
          results = results.slice(0, limitVal);
        }
        resolve({ data: results, error: null });
      }
    };
    return builder;
  }
}

let supabase;

if (process.env.MOCK_DB === 'true') {
  console.log('Using in-memory Supabase database mock for local testing.');
  supabase = new SupabaseMock();
} else {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL and/or SUPABASE_ANON_KEY');
  }

  if (!supabaseServiceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Falling back to SUPABASE_ANON_KEY; this should only be used for local development before RLS is enabled.');
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

module.exports = supabase;
