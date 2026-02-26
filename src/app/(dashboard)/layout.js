import AuthProvider from '@/components/AuthProvider';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';

export default function DashboardLayout({ children }) {
    return (
        <AuthProvider>
            <div className="main-layout">
                <Sidebar />
                <div className="main-content">
                    <TopHeader />
                    <div className="page-content">
                        {children}
                    </div>
                </div>
            </div>
        </AuthProvider>
    );
}
