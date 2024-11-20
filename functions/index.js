/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {getFirestore} = require("firebase-admin/firestore");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

const generateSearchTokens = (text) => {
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(token => token.length > 1);
  
  const result = new Set();
  
  tokens.forEach(token => {
    for (let i = 2; i <= token.length; i++) {
      for (let j = 0; j <= token.length - i; j++) {
        result.add(token.slice(j, j + i));
      }
    }
  });
  
  return Array.from(result);
};

// Listen for new documents in the 'books' collection
exports.indexNewBook = onDocumentCreated("books/{bookId}", async (event) => {
  const bookData = event.data.data();
  const bookId = event.data.id;
  
  // Generate tokens from title
  const titleTokens = generateSearchTokens(bookData.title);
  
  // Generate tokens from authors
  const authorTokens = bookData.authors.flatMap(author => 
    generateSearchTokens(author)
  );
  
  // Combine all tokens
  const tokens = [...new Set([...titleTokens, ...authorTokens])];
  
  // Create search index document
  const db = getFirestore();
  await db.collection('book_search_index').doc(bookId).set({
    title: bookData.title,
    authors: bookData.authors,
    thumbnail: bookData.thumbnail || null,
    tokens: tokens,
  });
});
