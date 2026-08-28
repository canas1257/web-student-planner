export function createNewPlannerData(user) {
  return {
    tasks: [],
    schedules: [],
    profile: {
      name: user?.user_metadata?.full_name || 'Pelajar Baru',
      className: '',
      school: '',
      email: user?.email || '',
      city: '',
      goal: '',
      dailyTarget: 2,
    },
    studyMinutes: 0,
    studyByDate: {},
    streak: 0,
  }
}
