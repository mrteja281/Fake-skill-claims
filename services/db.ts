import { User, CandidateProfile } from '../types';

const DB_KEY = 'skillchain_mongodb_store';

// Simulating a MongoDB Collection class
class Collection<T> {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  private getData(): T[] {
    const store = localStorage.getItem(DB_KEY);
    const db = store ? JSON.parse(store) : {};
    return db[this.name] || [];
  }

  private saveData(data: T[]) {
    const store = localStorage.getItem(DB_KEY);
    const db = store ? JSON.parse(store) : {};
    db[this.name] = data;
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  async findOne(query: Partial<T>): Promise<T | null> {
    // Simulate network latency (Database verification time)
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const data = this.getData();
    // @ts-ignore
    return data.find(item => Object.keys(query).every(key => item[key] === query[key])) || null;
  }

  async insertOne(doc: T): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const data = this.getData();
    data.push(doc);
    this.saveData(data);
    return doc;
  }

  async updateOne(query: Partial<T>, update: Partial<T>): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const data = this.getData();
    // @ts-ignore
    const index = data.findIndex(item => Object.keys(query).every(key => item[key] === query[key]));
    
    if (index === -1) return false;
    
    data[index] = { ...data[index], ...update };
    this.saveData(data);
    return true;
  }
}

// Initialize "Database"
export const db = {
  users: new Collection<User>('users'),
  logs: new Collection<{action: string, date: string}>('logs')
};
