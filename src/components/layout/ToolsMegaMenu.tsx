import { Link } from 'react-router-dom';
import { TOOL_CATEGORIES } from '../../lib/tools-catalog';

type ToolsMegaMenuProps = {
  onNavigate?: () => void;
  variant?: 'dropdown' | 'mobile';
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export default function ToolsMegaMenu({ onNavigate, variant = 'dropdown', onMouseEnter, onMouseLeave }: ToolsMegaMenuProps) {
  if (variant === 'mobile') {
    return (
      <div className="space-y-3">
        <p className="px-3 py-1 text-sm font-medium text-foreground">Tools</p>
        {TOOL_CATEGORIES.map((cat) => (
          <div key={cat.label} className="space-y-0.5">
            <p className="px-6 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cat.label}</p>
            {cat.tools.map((tool) => (
              <Link
                key={tool.to}
                to={tool.to}
                onClick={onNavigate}
                className="block px-6 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50"
              >
                {tool.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div 
      className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[min(720px,calc(100vw-2rem))] rounded-2xl bg-card border border-border shadow-2xl shadow-black/20 p-4 z-50"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOL_CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">{cat.label}</p>
            <div className="space-y-0.5">
              {cat.tools.map((tool) => (
                <Link
                  key={tool.to}
                  to={tool.to}
                  onClick={onNavigate}
                  className="block px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{tool.label}</span>
                    {tool.badge && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{tool.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tool.description}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
