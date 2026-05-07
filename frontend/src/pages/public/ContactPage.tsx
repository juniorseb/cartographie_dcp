import { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle, AlertCircle } from 'lucide-react';
import * as publicApi from '@/api/public.api';

const SUJETS = [
  'Question générale',
  'Inscription / Compte',
  'Problème technique',
  'Demande de rendez-vous',
  'Signalement',
  'Autre',
];

export default function ContactPage() {
  const [form, setForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    sujet: SUJETS[0],
    message: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);
    try {
      await publicApi.sendContactMessage({
        nom: form.nom,
        email: form.email,
        telephone: form.telephone || undefined,
        sujet: form.sujet,
        message: form.message,
      });
      setSuccess(true);
      setForm({ nom: '', email: '', telephone: '', sujet: SUJETS[0], message: '' });
    } catch {
      setError("Impossible d'envoyer votre message. Veuillez réessayer ou nous contacter directement.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Nous contacter</h1>
        <p className="text-gray-500">
          Une question, un problème ou une suggestion ? Notre équipe est à votre écoute.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coordonnées */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card">
            <h3 className="font-bold text-base mb-4">Coordonnées ARTCI</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[var(--artci-orange)] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Siège</div>
                  <div className="text-gray-500">
                    Marcory Zone 4<br />
                    Rue du Lycée Technique<br />
                    Abidjan, Côte d'Ivoire
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-[var(--artci-orange)] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Téléphone</div>
                  <div className="text-gray-500">+225 27 22 18 18 18</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[var(--artci-orange)] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Email</div>
                  <a href="mailto:contact@artci.ci" className="text-[var(--artci-orange)] hover:underline">
                    contact@artci.ci
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="card card-green">
            <h3 className="font-bold text-base mb-2">Horaires</h3>
            <p className="text-sm text-gray-700">
              Lundi - Vendredi<br />
              <span className="text-gray-500">8h00 - 17h00</span>
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="font-bold text-base mb-4">Envoyez-nous un message</h3>

            {success && (
              <div className="alert alert-success mb-4 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <strong>Message envoyé.</strong> Notre équipe vous répondra dans les plus brefs délais.
                </div>
              </div>
            )}
            {error && (
              <div className="alert alert-danger mb-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label htmlFor="nom">Nom complet *</label>
                  <input
                    id="nom"
                    name="nom"
                    type="text"
                    required
                    value={form.nom}
                    onChange={handleChange}
                    placeholder="Votre nom"
                  />
                </div>
                <div className="form-group mb-0">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="vous@exemple.ci"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label htmlFor="telephone">Téléphone</label>
                  <input
                    id="telephone"
                    name="telephone"
                    type="tel"
                    value={form.telephone}
                    onChange={handleChange}
                    placeholder="+225 ..."
                  />
                </div>
                <div className="form-group mb-0">
                  <label htmlFor="sujet">Sujet *</label>
                  <select
                    id="sujet"
                    name="sujet"
                    value={form.sujet}
                    onChange={handleChange}
                    required
                  >
                    {SUJETS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group mb-0">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Décrivez votre demande..."
                  minLength={10}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
              >
                {isLoading ? (
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer le message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
