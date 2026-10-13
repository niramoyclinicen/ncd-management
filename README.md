# NCD - Clinic & Diagnostic Management System

This is a professional-grade, comprehensive management system for **Niramoy Clinic & Diagnostic (NCD)**.

## 🚀 Key Modules
- **Dynamic Dashboard:** Role-based access to various departments.
- **Diagnostic Management:** Full lifecycle from patient registration and invoicing to automated lab reporting (CBC, Lipid Profile, Urine R/M/E, etc.) and reagent tracking.
- **Clinic Management:** Admission system, bed occupancy management, doctor rounds, nurse medication charts, and certificate generation (Birth, Death, Discharge).
- **Pharmacy (Medicine):** Advanced stock management, outdoor sales, indoor billing integration, and a drug database (Monograph).
- **Accounting:** Consolidated accounts sheet with automated profit calculation, shareholder profit sharing, and loan/installment tracking.
- **AI Assistant:** Integrated Google Gemini AI to query stock, expenses, and invoices using natural language (Bengali/English).
- **Cloud Sync:** Real-time data synchronization with Supabase for data security and multi-device access.

## 🛠️ Setup Instructions
1. **Extract the files:** Unzip all project files into a folder.
2. **Install Dependencies:** Open your terminal in the project folder and run:
   ```bash
   npm install
   ```
3. **Environment Variables:** Create a `.env` file or set these in your hosting provider (like Vercel):
   - `API_KEY`: Your Google Gemini API Key.
   - `SUPABASE_URL`: Your Supabase project URL.
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key.
4. **Run Development Server:**
   ```bash
   npm run dev
   ```
5. **Build for Production:**
   ```bash
   npm run build
   ```

## 🔐 Security & Access
- **Default Admin Password:** `admin123`
- Passwords for all departments can be managed and updated from the **Admin Settings** (Gear icon at the bottom right of the dashboard).

## 📄 License & Registration
- **Diagnostic License:** HSM41671
- **Clinic Registration:** HSM76710

---
*Developed for Niramoy Clinic & Diagnostic, Enayetpur, Sirajgonj.*
