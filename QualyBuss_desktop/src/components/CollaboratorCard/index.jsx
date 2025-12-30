import React from 'react';

const CollaboratorCard = ({ data, onClick }) => {
    const { full_name, role, department, active, avatar_url } = data;

    return (
        <div
            onClick={() => onClick(data)}
            className={`
        relative bg-white rounded-2xl p-6 cursor-pointer group transition-all duration-300
        border border-transparent hover:border-blue-100 hover:shadow-xl hover:-translate-y-1
        ${!active ? 'opacity-75 grayscale-[0.5]' : ''}
      `}
        >
            {/* Status Badge */}
            <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'} ring-2 ring-white`} />

            <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-blue-500 to-purple-500 group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                        <img
                            src={avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(full_name)}&background=random`}
                            alt={full_name}
                            className="w-full h-full rounded-full object-cover border-2 border-white"
                        />
                    </div>
                </div>

                <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {full_name}
                </h3>

                <p className="text-sm text-slate-500 font-medium mt-1 mb-3">
                    {role}
                </p>

                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    {department}
                </span>
            </div>

            {/* Hover Actions Hint */}
            <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-white via-white to-transparent rounded-b-2xl flex justify-center mt-2">
                <span className="text-xs text-blue-600 font-bold uppercase tracking-wide">Editar Perfil</span>
            </div>
        </div>
    );
};

export default CollaboratorCard;
