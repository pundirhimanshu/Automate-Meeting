export default function WorkflowsPage() {
    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Workflows</h1>
            </div>
            <div className="empty-state">
                <div className="empty-state-icon">⚡</div>
                <h3>Workflow Automation</h3>
                <p>Create automated workflows to send follow-up emails, trigger actions after meetings, and route leads automatically.</p>
                <button className="btn btn-primary">Create Workflow</button>
            </div>
        </div>
    );
}
