import React from 'react'
interface NavItemProps {
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
}

function NavItem({name,Icon}: NavItemProps) {
  return (
    <div className=' text-black flex items-center gap-3 text-[18px] font-semibold cursor-pointer hover:text-yellow-400'>
        <Icon  />
      <h2>{name}</h2>
    </div>
  )
}
export default NavItem