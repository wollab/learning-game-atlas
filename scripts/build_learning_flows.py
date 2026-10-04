"""Derive readable learning flows from reviewed bridges; no new skill claims."""
import argparse
import hashlib
import json
from pathlib import Path


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def build(bridges, activities):
    skills = {s['skill_id']: s for s in activities['skills']}
    games = {g['game_id']: g for g in bridges['games']}
    flows = []
    for bridge in bridges['bridges']:
        skill, game = skills[bridge['skill_id']], games[bridge['game_id']]
        flows.append({
            'bridge_id': bridge['bridge_id'], 'game_id': bridge['game_id'], 'skill_id': bridge['skill_id'],
            'skill_name': skill['name_en'], 'status': bridge['status'],
            'skill_definition_th': skill['unicef_definition']['summary_th'],
            'skill_definition_source': skill['unicef_definition'],
            'activity_title_th': bridge['activity_th'],
            'player_action_th': bridge['required_action_th'],
            'observable_behaviour_th': bridge['observable_behaviour_th'],
            'rule_summary_th': bridge['rule_evidence'].get('summary_th'),
            'rule_source': bridge['rule_evidence'],
            'core': [w for w in bridge['wizard_hat'] if w['framework_role'] == 'CORE'],
            'taste': [w for w in bridge['wizard_hat'] if w['framework_role'] == 'TASTE'],
            'mechanism_gap_th': bridge.get('wizard_hat_gap_th'),
            'conditions_th': bridge['conditions_th'], 'applicable_player_counts': bridge['applicable_player_counts'],
            'edition_scope': game['edition_scope'], 'role_th': bridge['role_th'],
            'debrief_question_th': skill['wol_activity']['debrief_question_th'],
            'debrief_provenance': 'existing WoL facilitation proposal; not UNICEF-prescribed activity',
            'observation_method_th': bridge['observation_method_th'],
            'counter_signal_th': bridge['counter_signal_th'],
            'observation_status': bridge['observation_status'],
            'learning_development_status': bridge['learning_development_status'],
            'transfer_status': bridge['transfer_status'],
            'source_locator': f"reviewed-skill-bridges.json → bridges[bridge_id={bridge['bridge_id']}]",
        })
    return {'schema_version': '1.0', 'dataset': 'reviewed-learning-flows', 'source_layer': 'derived',
            'claim_boundary_th': bridges['claim_boundary_th'],
            'source_sha256': hashlib.sha256(json.dumps([bridges, activities], ensure_ascii=False, sort_keys=True).encode()).hexdigest(),
            'game_count': len(games), 'flow_count': len(flows), 'flows': flows}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--shelf', required=True)
    args = parser.parse_args()
    shelf = Path(args.shelf)
    output = build(read(shelf/'reviewed-skill-bridges.json'), read(shelf/'learning-activities.json'))
    (shelf/'reviewed-learning-flows.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f"Derived {output['flow_count']} flows for {output['game_count']} games; source claims unchanged")
