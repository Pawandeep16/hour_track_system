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
  is(field: string, value: any): QueryBuilder<T>;
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
  private promise: Promise<{ data: T[] | null; error: Error | null }> | null = null;

  constructor(collectionName: string, selectFields?: string) {
    this.collectionName = collectionName;
    if (selectFields) {
      this.selectFields = selectFields.split(',').map(f => f.trim());
    }
  }

  then<TResult1 = { data: T[] | null; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[] | null; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    if (!this.promise) {
      this.promise = this.execute();
    }
    return this.promise.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<{ data: T[] | null; error: Error | null } | TResult> {
    if (!this.promise) {
      this.promise = this.execute();
    }
    return this.promise.catch(onrejected);
  }

  eq(field: string, value: any): QueryBuilder<T> {
    this.promise = null;
    if (field !== 'id') {
      this.constraints.push(where(field, '==', value));
    } else {
      this.constraints.push({ _isDocIdConstraint: true, value });
    }
    return this;
  }

  neq(field: string, value: any): QueryBuilder<T> {
    this.promise = null;
    this.constraints.push(where(field, '!=', value));
    return this;
  }

  gte(field: string, value: any): QueryBuilder<T> {
    this.promise = null;
    this.constraints.push(where(field, '>=', value));
    return this;
  }

  lte(field: string, value: any): QueryBuilder<T> {
    this.promise = null;
    this.constraints.push(where(field, '<=', value));
    return this;
  }

  is(field: string, value: any): QueryBuilder<T> {
    this.promise = null;
    if (value === null) {
      this.constraints.push(where(field, '==', null));
    } else {
      this.constraints.push(where(field, '==', value));
    }
    return this;
  }

  order(field: string, options?: { ascending?: boolean }): QueryBuilder<T> {
    this.promise = null;
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.constraints.push(orderBy(field, direction));
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.promise = null;
    this.constraints.push(limit(count));
    return this;
  }

  async single(): Promise<{ data: T | null; error: Error | null }> {
    return this.maybeSingle();
  }

  async maybeSingle(): Promise<{ data: T | null; error: Error | null }> {
    try {
      console.log(`[Firebase] Fetching single document from: ${this.collectionName}`);

      const docIdConstraint = this.constraints.find((c: any) => c._isDocIdConstraint);
      if (docIdConstraint) {
        const docRef = doc(db, this.collectionName, docIdConstraint.value);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.log(`[Firebase] No document found with ID ${docIdConstraint.value}`);
          return { data: null, error: null };
        }

        const data = { id: docSnap.id, ...docSnap.data() } as T;
        console.log(`[Firebase] Found document by ID in ${this.collectionName}:`, data);
        return { data, error: null };
      }

      const q = query(collection(db, this.collectionName), ...this.constraints, limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log(`[Firebase] No document found in ${this.collectionName}`);
        return { data: null, error: null };
      }

      const docData = snapshot.docs[0].data();
      const data = { id: snapshot.docs[0].id, ...docData } as T;
      console.log(`[Firebase] Found document in ${this.collectionName}:`, data);
      return { data, error: null };
    } catch (error) {
      console.error(`[Firebase] Error fetching single from ${this.collectionName}:`, error);
      return { data: null, error: error as Error };
    }
  }

  async execute(): Promise<{ data: T[] | null; error: Error | null }> {
    try {
      console.log(`[Firebase] Fetching from collection: ${this.collectionName}`);

      const docIdConstraint = this.constraints.find((c: any) => c._isDocIdConstraint);
      if (docIdConstraint) {
        const docRef = doc(db, this.collectionName, docIdConstraint.value);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.log(`[Firebase] No document found with ID ${docIdConstraint.value}`);
          return { data: [], error: null };
        }

        const data = [{ id: docSnap.id, ...docSnap.data() }] as T[];
        console.log(`[Firebase] Found document by ID in ${this.collectionName}`);
        return { data, error: null };
      }

      const validConstraints = this.constraints.filter((c: any) => !c._isDocIdConstraint);
      const q = query(collection(db, this.collectionName), ...validConstraints);
      const snapshot = await getDocs(q);

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];

      console.log(`[Firebase] Fetched ${data.length} documents from ${this.collectionName}`);
      return { data, error: null };
    } catch (error) {
      console.error(`[Firebase] Error fetching from ${this.collectionName}:`, error);
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
          console.log(`[Firebase] Inserting into ${collectionName}:`, data);
          const dataArray = Array.isArray(data) ? data : [data];
          const results = [];

          for (const item of dataArray) {
            const itemWithTimestamp = {
              ...item,
              created_at: new Date().toISOString()
            };
            const docRef = await addDoc(collection(db, collectionName), itemWithTimestamp);
            const inserted = { id: docRef.id, ...itemWithTimestamp };
            results.push(inserted);
            console.log(`[Firebase] Inserted document with ID: ${docRef.id}`);
          }

          return { data: Array.isArray(data) ? results : results[0], error: null };
        } catch (error) {
          console.error(`[Firebase] Error inserting into ${collectionName}:`, error);
          return { data: null, error: error as Error };
        }
      },

      update(data: Partial<T>) {
        return {
          eq: async (field: string, value: any) => {
            try {
              console.log(`[Firebase] Updating ${collectionName} where ${field} == ${value}`);

              if (field === 'id') {
                const docRef = doc(db, collectionName, value);
                await updateDoc(docRef, data as any);
                console.log(`[Firebase] Updated document ${value} in ${collectionName}`);
                return { data: null, error: null };
              }

              const q = query(collection(db, collectionName), where(field, '==', value));
              const snapshot = await getDocs(q);

              if (snapshot.empty) {
                console.log(`[Firebase] No documents found to update in ${collectionName}`);
                return { data: null, error: null };
              }

              for (const docSnapshot of snapshot.docs) {
                await updateDoc(doc(db, collectionName, docSnapshot.id), data as any);
                console.log(`[Firebase] Updated document ${docSnapshot.id} in ${collectionName}`);
              }

              return { data: null, error: null };
            } catch (error) {
              console.error(`[Firebase] Error updating ${collectionName}:`, error);
              return { data: null, error: error as Error };
            }
          }
        };
      },

      delete() {
        return {
          eq: async (field: string, value: any) => {
            try {
              console.log(`[Firebase] Deleting from ${collectionName} where ${field} == ${value}`);

              if (field === 'id') {
                const docRef = doc(db, collectionName, value);
                await deleteDoc(docRef);
                console.log(`[Firebase] Deleted document ${value} from ${collectionName}`);
                return { data: null, error: null };
              }

              const q = query(collection(db, collectionName), where(field, '==', value));
              const snapshot = await getDocs(q);

              if (snapshot.empty) {
                console.log(`[Firebase] No documents found to delete in ${collectionName}`);
                return { data: null, error: null };
              }

              for (const docSnapshot of snapshot.docs) {
                await deleteDoc(doc(db, collectionName, docSnapshot.id));
                console.log(`[Firebase] Deleted document ${docSnapshot.id} from ${collectionName}`);
              }

              return { data: null, error: null };
            } catch (error) {
              console.error(`[Firebase] Error deleting from ${collectionName}:`, error);
              return { data: null, error: error as Error };
            }
          }
        };
      }
    };
  }
};
