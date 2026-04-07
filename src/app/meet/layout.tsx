interface LayoutProps{
    children: React.ReactNode;
}

const Layout = ({children}: LayoutProps)=>{
    return (
        <div className="h-screen bg-[#1E164F]">
            {children}
        </div>
    )
}

export default Layout;