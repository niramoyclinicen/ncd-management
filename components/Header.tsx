import React from 'react';
import { Phone, MapPin } from 'lucide-react';
import { ClinicLogo } from './ClinicLogo';
import { dbService } from '../dbService';

const Header: React.FC = () => {
  const profile = dbService.getClinicProfile();
  return (
    <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo and Clinic Name */}
          <div className="flex items-center">
            <ClinicLogo size="md" showAura={false} />
            <div className="ml-4 flex flex-col justify-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-none">
                {profile.name || 'Niramoy Clinic & Diagnostic'}
              </h1>
              <span className="text-xs font-medium text-cyan-600 uppercase tracking-wider mt-1">
                {profile.tagline || 'Clinic Management Software'}
              </span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex items-center text-gray-600 group hover:text-primary-700 transition-colors cursor-default">
              <div className="p-2 bg-gray-50 rounded-full group-hover:bg-primary-50 transition-colors">
                <MapPin size={20} className="text-primary-500" />
              </div>
              <div className="ml-3 flex flex-col">
                <span className="text-xs font-semibold text-gray-400 uppercase">Address</span>
                <span className="text-sm font-medium text-gray-800">{profile.address || 'Enayetpur, Sirajgonj'}</span>
              </div>
            </div>

            <div className="flex items-center text-gray-600 group hover:text-primary-700 transition-colors cursor-default">
              <div className="p-2 bg-gray-50 rounded-full group-hover:bg-primary-50 transition-colors">
                <Phone size={20} className="text-primary-500" />
              </div>
              <div className="ml-3 flex flex-col">
                <span className="text-xs font-semibold text-gray-400 uppercase">Contact</span>
                <span className="text-sm font-medium text-gray-800">{profile.mobile || '01730 923007'}</span>
              </div>
            </div>
          </div>
          
          {/* Mobile Menu Button Placeholder (if needed later) */}
          <div className="md:hidden">
             {/* Simple mobile indicator */}
             <span className="text-primary-600 font-bold">NCD</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;