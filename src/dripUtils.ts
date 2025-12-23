// src/dripUtils.ts

/**
 * Representa a estrutura de um módulo que pode ter regras de liberação.
 * Garante que os campos necessários para o cálculo estejam presentes.
 */
export interface ReleasableModule {
    release_date: string | null;
    days_after_enrollment: number | null;
}

/**
 * Calcula se um módulo está bloqueado com base nas regras de liberação.
 * @param module - O objeto do módulo, contendo release_date e days_after_enrollment.
 * @param enrollmentDate - A data de inscrição do usuário no curso (em formato string ISO).
 * @returns Um objeto com o estado de bloqueio e a data de liberação formatada.
 */
export const checkModuleLock = (
    module: ReleasableModule,
    enrollmentDate: string | null
): { isLocked: boolean; availableOn: string } => {

    let isLocked = false;
    let availableOn = '';
    const now = new Date();

    // Regra 1: Liberação por número de dias após a inscrição
    if (module.days_after_enrollment != null && enrollmentDate) {
        const enrollment = new Date(enrollmentDate);
        const releaseDate = new Date(enrollment);
        releaseDate.setDate(releaseDate.getDate() + module.days_after_enrollment);
        
        if (now < releaseDate) {
            isLocked = true;
            availableOn = `Disponível em ${releaseDate.toLocaleDateString('pt-BR')}`;
        }
    // Regra 2: Liberação por data específica
    } else if (module.release_date) {
        const releaseDate = new Date(module.release_date);
        if (now < releaseDate) {
            isLocked = true;
            availableOn = `Disponível em ${releaseDate.toLocaleDateString('pt-BR')}`;
        }
    }

    return { isLocked, availableOn };
};
