const PageHeader = ({ title, description, bodyClassName, children }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 sm:mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      {children && (
        <div className={`flex items-center gap-2 ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
