import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ShoppingProvider } from "@/contexts/ShoppingContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RecipePage } from "@/pages/RecipePage";
import { EditRecipePage } from "@/pages/EditRecipePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { BooksPage } from "@/pages/BooksPage";
import { BookDetailPage } from "@/pages/BookDetailPage";
import { CreateRecipePage } from "@/pages/CreateRecipePage";
import { HomePage } from "@/pages/HomePage";
import { ShoppingListPage } from "@/pages/ShoppingListPage";
import { MyKitchenPage } from "@/pages/MyKitchenPage";
import { ModerationPage } from "@/pages/ModerationPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { NavBar } from "@/components/NavBar";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  return (
    <AuthProvider>
      <ShoppingProvider>
        <TooltipProvider delayDuration={300}>
          <BrowserRouter>
            <NavBar />
            <main className="w-full max-w-6xl mx-auto px-4 py-6 flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/recipes/new" element={<CreateRecipePage />} />
                <Route path="/recipes/:slug/edit" element={<EditRecipePage />} />
                <Route path="/recipes/:slug" element={<RecipePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/books" element={<BooksPage />} />
                <Route path="/books/share/:token" element={<BookDetailPage shared />} />
                <Route path="/books/:id" element={<BookDetailPage />} />
                <Route path="/shopping-list" element={<ShoppingListPage />} />
                <Route path="/kitchen" element={<MyKitchenPage />} />
                <Route path="/moderation" element={<ModerationPage />} />
                <Route path="/@:username" element={<ProfilePage />} />
              </Routes>
            </main>
            <Toaster position="bottom-center" />
          </BrowserRouter>
        </TooltipProvider>
      </ShoppingProvider>
    </AuthProvider>
  );
}
