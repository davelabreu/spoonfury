import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RecipePage } from "@/pages/RecipePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { BooksPage } from "@/pages/BooksPage";
import { BookDetailPage } from "@/pages/BookDetailPage";
import { CreateRecipePage } from "@/pages/CreateRecipePage";
import { HomePage } from "@/pages/HomePage";
import { NavBar } from "@/components/NavBar";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recipes/new" element={<CreateRecipePage />} />
            <Route path="/recipes/:slug" element={<RecipePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/books/share/:token" element={<BookDetailPage shared />} />
            <Route path="/books/:id" element={<BookDetailPage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
