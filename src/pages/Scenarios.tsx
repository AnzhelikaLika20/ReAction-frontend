import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X } from "lucide-react";
import { scenarioService } from "../services/scenarioService";
import type { Scenario } from "../types";
import styles from "./Scenarios.module.css";

type ModalMode = "view" | "edit" | "create";

export default function Scenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    trigger_phrase: "",
    reminder_title_template: "",
    reminder_description_template: "",
    reminder_minutes_before: 30,
    is_active: true,
  });

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await scenarioService.getAll();
      setScenarios(data);
    } catch (error) {
      console.error("Failed to load scenarios:", error);
    }
  };

  const handleCreate = () => {
    setCurrentScenario(null);
    setModalMode("create");
    setFormData({
      name: "",
      trigger_phrase: "",
      reminder_title_template: "",
      reminder_description_template: "",
      reminder_minutes_before: 30,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleView = async (scenario: Scenario) => {
    try {
      const fullScenario = await scenarioService.getById(scenario.id);
      setCurrentScenario(fullScenario);
      setModalMode("view");
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to load scenario:", error);
      alert("Ошибка при загрузке сценария");
    }
  };

  const handleEdit = (scenario: Scenario, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentScenario(scenario);
    setModalMode("edit");
    setFormData({
      name: scenario.name,
      trigger_phrase: scenario.trigger_phrase,
      reminder_title_template: scenario.reminder_title_template,
      reminder_description_template:
        scenario.reminder_description_template || "",
      reminder_minutes_before: scenario.reminder_minutes_before,
      is_active: scenario.is_active,
    });
    setIsModalOpen(true);
  };

  const handleEditFromView = () => {
    if (currentScenario) {
      setModalMode("edit");
      setFormData({
        name: currentScenario.name,
        trigger_phrase: currentScenario.trigger_phrase,
        reminder_title_template: currentScenario.reminder_title_template,
        reminder_description_template:
          currentScenario.reminder_description_template || "",
        reminder_minutes_before: currentScenario.reminder_minutes_before,
        is_active: currentScenario.is_active,
      });
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm("Вы уверены, что хотите удалить этот сценарий?")) {
      return;
    }

    try {
      await scenarioService.delete(id);
      await loadScenarios();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to delete scenario:", error);
      alert("Ошибка при удалении сценария");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (modalMode === "edit" && currentScenario) {
        await scenarioService.update(currentScenario.id, formData);
      } else {
        await scenarioService.create(formData);
      }
      await loadScenarios();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save scenario:", error);
      alert("Ошибка при сохранении сценария");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Мои сценарии</h1>
        <button className={styles.createButton} onClick={handleCreate}>
          <Plus size={20} />
          Создать сценарий
        </button>
      </div>

      {scenarios.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Нет сценариев</div>
          <p>Создайте первый сценарий для анализа сообщений</p>
        </div>
      ) : (
        <div className={styles.list}>
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={styles.card}
              onClick={() => handleView(scenario)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{scenario.name}</h3>
                  <span
                    className={`${styles.badge} ${
                      scenario.is_active
                        ? styles.badgeActive
                        : styles.badgeInactive
                    }`}
                  >
                    {scenario.is_active ? "Активен" : "Неактивен"}
                  </span>
                </div>
                <div className={styles.cardDetails}>
                  <div>
                    <strong>Триггер:</strong> {scenario.trigger_phrase}
                  </div>
                  <div>
                    <strong>Шаблон:</strong> {scenario.reminder_title_template}
                  </div>
                  <div>
                    <strong>Напомнить за:</strong>{" "}
                    {scenario.reminder_minutes_before} мин
                  </div>
                </div>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={styles.iconButton}
                  onClick={(e) => handleEdit(scenario, e)}
                  title="Редактировать"
                >
                  <Edit size={20} />
                </button>
                <button
                  className={styles.iconButton}
                  onClick={(e) => handleDelete(scenario.id, e)}
                  title="Удалить"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className={styles.modal} onClick={() => setIsModalOpen(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modalMode === "view"
                  ? "Просмотр сценария"
                  : modalMode === "edit"
                    ? "Редактировать сценарий"
                    : "Создать сценарий"}
              </h2>
              <button
                className={styles.closeButton}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={24} />
              </button>
            </div>

            {modalMode === "view" && currentScenario ? (
              <div className={styles.viewMode}>
                <div className={styles.viewField}>
                  <div className={styles.viewLabel}>Название сценария</div>
                  <div className={styles.viewValue}>{currentScenario.name}</div>
                </div>

                <div className={styles.viewField}>
                  <div className={styles.viewLabel}>Ключевая фраза</div>
                  <div className={styles.viewValue}>
                    {currentScenario.trigger_phrase}
                  </div>
                </div>

                <div className={styles.viewField}>
                  <div className={styles.viewLabel}>Шаблон заголовка</div>
                  <div className={styles.viewValue}>
                    {currentScenario.reminder_title_template}
                  </div>
                </div>

                {currentScenario.reminder_description_template && (
                  <div className={styles.viewField}>
                    <div className={styles.viewLabel}>Шаблон описания</div>
                    <div className={styles.viewValue}>
                      {currentScenario.reminder_description_template}
                    </div>
                  </div>
                )}

                <div className={styles.viewField}>
                  <div className={styles.viewLabel}>Напомнить за</div>
                  <div className={styles.viewValue}>
                    {currentScenario.reminder_minutes_before === 0
                      ? "В момент события"
                      : `${currentScenario.reminder_minutes_before} минут`}
                  </div>
                </div>

                <div className={styles.viewField}>
                  <div className={styles.viewLabel}>Статус</div>
                  <div className={styles.viewValue}>
                    <span
                      className={`${styles.badge} ${
                        currentScenario.is_active
                          ? styles.badgeActive
                          : styles.badgeInactive
                      }`}
                    >
                      {currentScenario.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Закрыть
                  </button>
                  <button
                    type="button"
                    className={styles.submitButton}
                    onClick={handleEditFromView}
                  >
                    <Edit size={18} style={{ marginRight: "0.5rem" }} />
                    Редактировать
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="name" className={styles.label}>
                    Название сценария *
                  </label>
                  <input
                    id="name"
                    type="text"
                    className={styles.input}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="trigger_phrase" className={styles.label}>
                    Ключевая фраза *
                  </label>
                  <input
                    id="trigger_phrase"
                    type="text"
                    className={styles.input}
                    value={formData.trigger_phrase}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trigger_phrase: e.target.value,
                      })
                    }
                    placeholder="встреча, запись на прием"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label
                    htmlFor="reminder_title_template"
                    className={styles.label}
                  >
                    Шаблон заголовка *
                  </label>
                  <input
                    id="reminder_title_template"
                    type="text"
                    className={styles.input}
                    value={formData.reminder_title_template}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reminder_title_template: e.target.value,
                      })
                    }
                    placeholder="Встреча: {'{topic}'}"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label
                    htmlFor="reminder_description_template"
                    className={styles.label}
                  >
                    Шаблон описания
                  </label>
                  <textarea
                    id="reminder_description_template"
                    className={styles.textarea}
                    value={formData.reminder_description_template}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reminder_description_template: e.target.value,
                      })
                    }
                    placeholder="Не забудьте..."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label
                    htmlFor="reminder_minutes_before"
                    className={styles.label}
                  >
                    Напомнить за (минут) *
                  </label>
                  <select
                    id="reminder_minutes_before"
                    className={styles.select}
                    value={formData.reminder_minutes_before}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reminder_minutes_before: Number(e.target.value),
                      })
                    }
                  >
                    <option value={0}>В момент события</option>
                    <option value={15}>15 минут</option>
                    <option value={30}>30 минут</option>
                    <option value={60}>1 час</option>
                    <option value={120}>2 часа</option>
                  </select>
                </div>

                <div className={styles.checkbox}>
                  <input
                    id="is_active"
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                  />
                  <label htmlFor="is_active" className={styles.label}>
                    Активировать сценарий
                  </label>
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => setIsModalOpen(false)}
                    disabled={loading}
                  >
                    Отменить
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={loading}
                  >
                    {loading ? "Сохранение..." : "Сохранить"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
