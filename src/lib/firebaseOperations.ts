import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  WhereFilterOp
} from 'firebase/firestore';
import { db } from './firebase';

interface QueryBuilder<T> {
  eq(field: string, value: any): QueryBuilder<T>;
  neq(field: string, value: any): QueryBuilder<T>;
  gte(field: string, value: any): QueryBuilder<T>;
  lte(field: string, value: any): QueryBuilder<T>;
  order(field: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  single(): Promise<{ data: T | null; error: Error | null }>;
  maybeSingle(): Promise<{ data: T | null; error: Error | null }>;
  execute(): Promise<{ data: T[] | null; error: Error | null }>;
}

class FirestoreQueryBuilder<T> implements QueryBuilder<T> {
  private collectionName: string;
  private constraints: any[] = [];
  private selectFields: string[] = [];

  constructor(collectionName: string, selectFields?: string) {
    this.collectionName = collectionName;
    if (selectFields) {
      this.selectFields = selectFields.split(',').map(f => f.trim());
    }
  }

  eq(field: string, value: any): QueryBuilder<T> {
    this.constraints.push(where(field, '==', value));
    return this;
  }

  neq(field: string, value: any): QueryBuilder<T> {
    this.constraints.push(where(field, '!=', value));
    return this;
  }

  gte(field: string, value: any): QueryBuilder<T> {
    this.constraints.push(where(field, '>=', value));
    return this;
  }

  lte(field: string, value: any): QueryBuilder<T> {
    this.constraints.push(where(field, '<=', value));
    return this;
  }

  order(field: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.constraints.push(orderBy(field, direction));
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.constraints.push(limit(count));
    return this;
  }

  async single(): Promise<{ data: T | null; error: Error | null }> {
    return this.maybeSingle();
  }

  async maybeSingle(): Promise<{ data: T | null; error: Error | null }> {
    try {
      const q = query(collection(db, this.collectionName), ...this.constraints, limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { data: null, error: null };
      }

      const docData = snapshot.docs[0].data();
      const data = { id: snapshot.docs[0].id, ...docData } as T;
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async execute(): Promise<{ data: T[] | null; error: Error | null }> {
    try {
      const q = query(collection(db, this.collectionName), ...this.constraints);
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

export const firebaseDb = {
  from<T>(collectionName: string) {
    return {
      select(fields?: string) {
        const builder = new FirestoreQueryBuilder<T>(collectionName, fields);
        return builder;
      },

      async insert(data: Partial<T> | Partial<T>[]) {
        try {
          const dataArray = Array.isArray(data) ? data : [data];
          const results = [];

          for (const item of dataArray) {
            const itemWithTimestamp = {
              ...item,
              created_at: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, collectionName), itemWithTimestamp);
            results.push({ id: docRef.id, ...itemWithTimestamp });
          }

          return { data: Array.isArray(data) ? results : results[0], error: null };
        } catch (error) {
          return { data: null, error: error as Error };
        }
      },

      async update(data: Partial<T>) {
        return {
          eq: async (field: string, value: any) => {
            try {
              const q = query(collection(db, collectionName), where(field, '==', value));
              const snapshot = await getDocs(q);

              for (const docSnapshot of snapshot.docs) {
                await updateDoc(doc(db, collectionName, docSnapshot.id), data as any);
              }

              return { data: null, error: null };
            } catch (error) {
              return { data: null, error: error as Error };
            }
          }
        };
      },

      async delete() {
        return {
          eq: async (field: string, value: any) => {
            try {
              const q = query(collection(db, collectionName), where(field, '==', value));
              const snapshot = await getDocs(q);

              for (const docSnapshot of snapshot.docs) {
                await deleteDoc(doc(db, collectionName, docSnapshot.id));
              }

              return { data: null, error: null };
            } catch (error) {
              return { data: null, error: error as Error };
            }
          }
        };
      }
    };
  }
};
