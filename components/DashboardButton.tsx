import React from 'react';

interface DashboardButtonProps {
  label: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  glowGradient: string;
  borderColor: string;
  iconBgColor?: string;
  delay: string;
}

const DashboardButton: React.FC<DashboardButtonProps> = ({
  label,
  icon,
  onClick,
  glowGradient,
  borderColor,
  iconBgColor,
  delay,
}) => {
  return (
    <div
      className="w-full h-full animate-fade-in-up relative"
      style={{ animationDelay: delay }}
    >
      <div
        className="
          relative group w-full h-full
          transition-all duration-300 ease-out
          hover:z-40
          hover:scale-[1.02]
          sm:hover:scale-[1.04]
          lg:hover:scale-[1.06]
          hover:-translate-y-1
          sm:hover:-translate-y-1.5
          active:scale-[0.98]
        "
      >
        {/* Outer Glow Aura */}
        <div
          className={`
            absolute
            -inset-1
            sm:-inset-1.5
            lg:-inset-2
            rounded-2xl
            sm:rounded-3xl
            bg-gradient-to-r ${glowGradient}
            opacity-0
            group-hover:opacity-80
            group-active:opacity-80
            blur-md
            sm:blur-lg
            lg:blur-xl
            transition-all duration-300
            -z-10
            pointer-events-none
          `}
        />

        {/* Main Card */}
        <button
          type="button"
          onClick={onClick}
          className={`
            relative
            flex flex-col items-center justify-center
            cursor-pointer
            w-full
            min-w-0

            py-2
            px-2
            xs:py-2.5
            xs:px-2
            sm:py-3
            sm:px-3
            md:py-4
            md:px-4
            lg:py-5
            lg:px-5

            h-[110px]
            xs:h-[118px]
            sm:h-[128px]
            md:h-[150px]
            lg:h-[180px]
            xl:h-[196px]

            rounded-2xl
            sm:rounded-3xl

            border-2
            ${borderColor}

            bg-gradient-to-b
            from-slate-900
            via-slate-900
            to-slate-950

            shadow-xl
            hover:shadow-2xl

            transition-all
            duration-300

            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-white/70
            focus-visible:ring-offset-2
            focus-visible:ring-offset-slate-950

            active:scale-[0.98]
          `}
        >
          {/* Icon Circle */}
          <div
            className={`
              flex items-center justify-center
              shrink-0

              mb-1
              xs:mb-1.5
              sm:mb-2
              md:mb-2.5
              lg:mb-3

              p-1.5
              xs:p-2
              sm:p-2.5
              md:p-2.5
              lg:p-3

              rounded-full

              bg-slate-800/95
              border
              border-slate-700/80

              text-slate-300

              ${iconBgColor || 'group-hover:text-white'}

              group-hover:scale-105
              group-active:scale-105

              transition-all
              duration-300

              shadow-inner
            `}
          >
            {React.isValidElement(icon) ? (
              <div
                className="
                  flex items-center justify-center
                  scale-[0.68]
                  xs:scale-[0.74]
                  sm:scale-[0.80]
                  md:scale-[0.88]
                  lg:scale-100
                "
              >
                {React.cloneElement(
                  icon as React.ReactElement<any>,
                  {
                    size: 36,
                  }
                )}
              </div>
            ) : (
              icon
            )}
          </div>

          {/* Label */}
          <div
            className="
              text-center
              z-10
              w-full
              min-w-0
              px-1
              sm:px-2
              leading-tight

              group-hover:scale-[1.03]
              group-active:scale-[1.03]

              transition-transform
              duration-300
            "
          >
            {typeof label === 'string' ? (
              <span
                className="
                  block
                  text-sm
                  xs:text-base
                  sm:text-lg
                  md:text-xl
                  lg:text-2xl

                  font-bold
                  text-slate-200
                  group-hover:text-white

                  tracking-wide
                  leading-tight

                  transition-colors
                  duration-300

                  break-words
                "
              >
                {label}
              </span>
            ) : (
              label
            )}
          </div>
        </button>
      </div>
    </div>
  );
};

export default DashboardButton;
