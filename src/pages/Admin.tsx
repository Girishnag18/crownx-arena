import { BarChart3, ShieldAlert, Users } from "lucide-react";

const cards = [
  { title: "Total users", value: "12,480", icon: Users },
  { title: "Open reports", value: "42", icon: ShieldAlert },
  { title: "Weekly matches", value: "94,210", icon: BarChart3 },
];

const Admin = () => {
  return (
    <main className="container max-w-6xl py-24 px-4">
      <h1 className="text-4xl font-bold mb-2">Admin Command Center</h1>
      <p className="text-muted-foreground mb-8">Moderation, analytics, and player governance.</p>
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <article key={card.title} className="glass-card p-5">
            <card.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-sm text-muted-foreground">{card.title}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </article>
        ))}
      </div>
      <section className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4">Moderation actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 rounded-lg bg-secondary">Ban user</button>
          <button className="px-4 py-2 rounded-lg bg-secondary">Suspend user</button>
          <button className="px-4 py-2 rounded-lg bg-secondary">Reset rating</button>
          <button className="px-4 py-2 rounded-lg bg-secondary">Review chat reports</button>
        </div>
      </section>
    </main>
  );
};

export default Admin;
